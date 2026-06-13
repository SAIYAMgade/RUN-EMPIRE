import { pool } from '../db/pool';
import { redis } from '../db/redis';
import type { TileState } from '../types';

const CACHE_KEY = 'tiles:full_snapshot';
const CACHE_TTL = 30; // seconds

export async function getTileSnapshot(): Promise<TileState[]> {
  // Try Redis first
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as TileState[];
    } catch (e) {
      // JSON parse error, ignore cache and fetch from DB
    }
  }

  // Rebuild from PostgreSQL
  const { rows } = await pool.query(`
    SELECT
      tile_key, row_idx, col_idx, center_lat, center_lng,
      owner_id, owner_color, owner_name, claimed_at, claim_count
    FROM tiles
    ORDER BY row_idx, col_idx
  `);

  const snapshot: TileState[] = rows.map(r => ({
    tileKey:    r.tile_key,
    rowIdx:     r.row_idx,
    colIdx:     r.col_idx,
    centerLat:  parseFloat(r.center_lat),
    centerLng:  parseFloat(r.center_lng),
    ownerId:    r.owner_id,
    ownerColor: r.owner_color,
    ownerName:  r.owner_name,
    claimedAt:  r.claimed_at ? new Date(r.claimed_at).toISOString() : null,
    claimCount: r.claim_count,
  }));

  // Store in cache
  await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(snapshot));
  return snapshot;
}

// Call this after every claim to invalidate the snapshot
export async function invalidateSnapshot() {
  await redis.del(CACHE_KEY);
}
