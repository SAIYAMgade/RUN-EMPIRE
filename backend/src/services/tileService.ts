import { pool } from '../db/pool';
import { redis } from '../db/redis';
import { Server } from 'socket.io';
import type { User, TileUpdateEvent, ActivityEvent, GeoJSONPolygon } from '../types';
import { broadcastLeaderboard } from '../socket/socketServer';

// Ray-casting point-in-polygon algorithm
export function isPointInPolygon(point: [number, number], coordinates: number[][][]): boolean {
  const [x, y] = point;
  let inside = false;
  
  // A GeoJSON Polygon's coordinates is an array of rings (usually just one exterior ring, index 0)
  const ring = coordinates[0];
  if (!ring || ring.length < 3) return false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export async function claimTile(
  tileKey: string,
  newOwner: User,
  io: Server
): Promise<TileUpdateEvent> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // LOCK the row — prevents simultaneous claims on the same tile
    const { rows } = await client.query(
      `SELECT id, owner_id, owner_name FROM tiles WHERE tile_key = $1 FOR UPDATE`,
      [tileKey]
    );

    if (!rows[0]) throw new Error(`Tile ${tileKey} not found`);
    
    const tile = rows[0];
    const oldOwnerId: string | null = tile.owner_id;
    const oldOwnerName: string | null = tile.owner_name;
    const isSteal = !!oldOwnerId && oldOwnerId !== newOwner.id;

    // Update tile ownership
    await client.query(`
      UPDATE tiles
      SET owner_id    = $1,
          owner_color = $2,
          owner_name  = $3,
          claimed_at  = NOW(),
          claim_count = claim_count + 1
      WHERE tile_key = $4
    `, [newOwner.id, newOwner.color, newOwner.name, tileKey]);

    // Decrement stolen-from user's count
    let oldOwnerUpdatedScore = 0;
    if (isSteal && oldOwnerId) {
      const decrRes = await client.query(`
        UPDATE users
        SET tiles_owned  = GREATEST(0, tiles_owned - 1),
            total_stolen = total_stolen + 1
        WHERE id = $1
        RETURNING tiles_owned
      `, [oldOwnerId]);
      oldOwnerUpdatedScore = decrRes.rows[0]?.tiles_owned || 0;
    }

    // Increment new owner's counts
    const incrRes = await client.query(`
      UPDATE users
      SET tiles_owned   = tiles_owned + 1,
          total_claimed = total_claimed + 1,
          last_active   = NOW()
      WHERE id = $1
      RETURNING tiles_owned
    `, [newOwner.id]);
    const newOwnerUpdatedScore = incrRes.rows[0]?.tiles_owned || 0;

    // Log the event
    await client.query(`
      INSERT INTO events_log
        (tile_key, action, new_owner_id, new_owner_name, new_owner_color, old_owner_id, old_owner_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [tileKey,
        isSteal ? 'steal' : 'claim',
        newOwner.id, newOwner.name, newOwner.color,
        oldOwnerId, oldOwnerName]);

    await client.query('COMMIT');

    // ── Redis updates (non-blocking, fire-and-forget) ──
    redis.zadd('leaderboard', newOwnerUpdatedScore, newOwner.id).catch(() => {});
    if (isSteal && oldOwnerId) {
      redis.zadd('leaderboard', oldOwnerUpdatedScore, oldOwnerId).catch(() => {});
    }
    
    // Invalidate tile cache (will be rebuilt on next read)
    redis.del(`tiles:full_snapshot`).catch(() => {});

    // ── Build broadcast payload ──
    const now = new Date().toISOString();
    const updatePayload: TileUpdateEvent = {
      tileKey,
      ownerId:      newOwner.id,
      ownerColor:   newOwner.color,
      ownerName:    newOwner.name,
      claimedAt:    now,
      isSteal,
      oldOwnerId,
      oldOwnerName,
    };

    // Broadcast tile change to ALL clients
    io.emit('tile:updated', updatePayload);

    // Activity feed event
    const activityEvent: ActivityEvent = {
      type:       isSteal ? 'steal' : 'claim',
      actor:      newOwner.name,
      actorColor: newOwner.color,
      victim:     oldOwnerName,
      tileKey,
      timestamp:  now,
    };
    io.emit('activity:event', activityEvent);

    // Notify the victim privately (their personal room)
    if (isSteal && oldOwnerId) {
      io.to(`user:${oldOwnerId}`).emit('tile:stolen-alert', {
        tileKey,
        stolenBy:      newOwner.name,
        stolenByColor: newOwner.color,
      });
    }

    // Push updated leaderboard to all (debounced)
    broadcastLeaderboard(io).catch(() => {});

    return updatePayload;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function claimPolygon(
  polygon: GeoJSONPolygon,
  owner: User,
  io: Server
): Promise<{ totalClaimed: number; tiles: TileUpdateEvent[] }> {
  // Fetch all tiles' bounding coordinates to do Point-in-Polygon checks
  const { rows } = await pool.query(`
    SELECT tile_key, center_lat, center_lng FROM tiles
  `);

  // Filter tiles whose center point lies within the drawn polygon
  const matchingTiles = rows.filter(t => {
    // GeoJSON works with [lng, lat] format
    const point: [number, number] = [parseFloat(t.center_lng), parseFloat(t.center_lat)];
    return isPointInPolygon(point, polygon.coordinates);
  });

  // Limit to 100 tiles for safety/performance
  const slicedTiles = matchingTiles.slice(0, 100);

  if (slicedTiles.length === 0) return { totalClaimed: 0, tiles: [] };

  // Claim each tile concurrently (each has its own database transaction for correctness)
  const results = await Promise.allSettled(
    slicedTiles.map(r => claimTile(r.tile_key, owner, io))
  );

  const claimed = results
    .filter((r): r is PromiseFulfilledResult<TileUpdateEvent> => r.status === 'fulfilled')
    .map(r => r.value);

  // Batch event for the draw action itself (so clients can show a polygon flash)
  io.emit('tiles:batch-updated', claimed);

  return { totalClaimed: claimed.length, tiles: claimed };
}
