import { Router } from 'express';
import { pool } from '../db/pool';
import { redis } from '../db/redis';
import { getIoInstance, broadcastLeaderboard } from '../socket/socketServer';

const router = Router();

// GET /api/users/:id - Get user profile and stats
router.get('/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, avatar_url, color, tiles_owned, total_claimed, total_stolen, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Get live rank from Redis Sorted Set (ZSET is 0-indexed, reverse rank)
    const redisRank = await redis.zrevrank('leaderboard', userId);
    const rank = redisRank !== null ? redisRank + 1 : null;

    res.json({
      ...user,
      rank,
    });
  } catch (err) {
    console.error('Failed to get user details:', err);
    res.status(500).json({ error: 'Failed to retrieve user statistics' });
  }
});

// POST /api/users/update-color - Update user color and all their claimed tiles
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
router.post('/update-color', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { color } = req.body;
  const user = req.user;

  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return res.status(400).json({ error: 'Valid hex color is required (e.g. #FF0000)' });
  }

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update user profile color
    await client.query(`UPDATE users SET color = $1 WHERE id = $2`, [color, user.id]);

    // 2. Update all tiles owned by the user
    await client.query(`UPDATE tiles SET owner_color = $1 WHERE owner_id = $2`, [color, user.id]);

    await client.query('COMMIT');

    // Invalidate Redis snapshot cache
    await redis.del('tiles:full_snapshot');

    // Broadcast color update via sockets
    const io = getIoInstance();
    if (io) {
      io.emit('user:color-updated', { userId: user.id, color });
      broadcastLeaderboard(io);
    }

    res.json({ success: true, color });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to update user color:', err);
    res.status(500).json({ error: 'Failed to update color' });
  } finally {
    client.release();
  }
});

export default router;
