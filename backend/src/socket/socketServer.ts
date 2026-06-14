import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient, redis } from '../db/redis';
import { socketAuthMiddleware } from '../middleware/socketAuthMiddleware';
import { claimTile, claimPolygon } from '../services/tileService';
import { getTileSnapshot } from '../services/cacheService';
import { getLeaderboard } from '../services/leaderboardService';
import type { ServerToClientEvents, ClientToServerEvents } from '../types';
import { isOriginAllowed } from '../utils/cors';

let ioInstance: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export async function createSocketServer(httpServer: any) {
  // Connect Redis adapter clients
  if (pubClient.status === 'wait' || pubClient.status === 'close') {
    await pubClient.connect();
  }
  if (subClient.status === 'wait' || subClient.status === 'close') {
    await subClient.connect();
  }
  
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    },
    pingTimeout:   20000,
    pingInterval:  10000,
    maxHttpBufferSize: 1e6,  // 1MB max message size
  });

  io.adapter(createAdapter(pubClient, subClient));
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const user = socket.data.user;
    if (!user) return;
    
    // Personal room for targeted notifications (e.g. tile stolen alerts)
    socket.join(`user:${user.id}`);

    // Track online presence in Redis SET
    await redis.sadd('online_users', user.id);
    const onlineCount = await redis.scard('online_users');
    
    // Welcome the new user with full tile state (from Redis cache)
    const snapshot = await getTileSnapshot();
    socket.emit('tiles:initial-state', snapshot);
    
    // Tell everyone about the new user + online count
    io.emit('users:online-count', onlineCount);
    io.emit('users:joined', {
      id:        user.id,
      name:      user.name,
      color:     user.color,
      avatarUrl: user.avatarUrl,
    });

    // ── CLAIM SINGLE TILE ────────────────────────────────────
    socket.on('tile:claim', async (tileKey, callback) => {
      // Validate tile key format (e.g. r12c34)
      if (!/^r\d{2}c\d{2}$/.test(tileKey)) {
        return callback({ error: 'Invalid tile key' });
      }

      // Redis rate limiter: 3 claims per second per user
      const rk = `rate:claim:${user.id}`;
      const reqs = await redis.incr(rk);
      if (reqs === 1) await redis.expire(rk, 1);
      if (reqs > 3) {
        return callback({ error: '⚡ Too fast! Slow down a little.' });
      }

      try {
        const result = await claimTile(tileKey, user, io);
        callback({ success: true, result });
      } catch (err) {
        console.error('Claim error:', err);
        callback({ error: 'Claim failed. Please try again.' });
      }
    });

    // ── CLAIM BY DRAWING ─────────────────────────────────────
    socket.on('tiles:draw', async (polygon, callback) => {
      // Rate limit: 1 draw every 5 seconds per user
      const drawKey = `rate:draw:${user.id}`;
      const draws = await redis.incr(drawKey);
      if (draws === 1) await redis.expire(drawKey, 5);
      if (draws > 1) {
        return callback({ error: '✋ Wait 5 seconds between draw actions.' });
      }

      try {
        const result = await claimPolygon(polygon, user, io);
        callback({ success: true, totalClaimed: result.totalClaimed });
      } catch (err) {
        console.error('Draw claim error:', err);
        callback({ error: 'Draw action failed. Please try again.' });
      }
    });

    // ── HEARTBEAT ────────────────────────────────────────────
    socket.on('user:ping', () => {
      // Keeping online state alive
      redis.sadd('online_users', user.id).catch(() => {});
    });

    // ── DISCONNECT ───────────────────────────────────────────
    socket.on('disconnect', async () => {
      await redis.srem('online_users', user.id);
      const onlineCount = await redis.scard('online_users');
      io.emit('users:online-count', onlineCount);
      io.emit('users:left', user.id);
    });
  });

  ioInstance = io;
  return io;
}

// Debounced leaderboard broadcast (called after claims)
let leaderboardTimer: ReturnType<typeof setTimeout> | null = null;
export async function broadcastLeaderboard(io: Server) {
  if (leaderboardTimer) return; // Already scheduled
  leaderboardTimer = setTimeout(async () => {
    const leaderboard = await getLeaderboard(10);
    io.emit('leaderboard:update', leaderboard);
    leaderboardTimer = null;
  }, 500); // Debounce: max one broadcast per 500ms
}

export function getIoInstance() {
  return ioInstance;
}
