import { pool } from '../db/pool';
import { redis } from '../db/redis';
import type { LeaderboardEntry } from '../types';

// Get top N users from Redis ZSET (O(log N) — extremely fast)
export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const topUserIds = await redis.zrevrange('leaderboard', 0, limit - 1, 'WITHSCORES');

  if (!topUserIds.length) return rebuildLeaderboard(limit);

  const userIds: string[] = [];
  const scores: Record<string, number> = {};
  for (let i = 0; i < topUserIds.length; i += 2) {
    userIds.push(topUserIds[i]);
    scores[topUserIds[i]] = parseInt(topUserIds[i + 1]);
  }

  if (userIds.length === 0) return [];

  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await pool.query(`
    SELECT id, name, avatar_url, color, tiles_owned
    FROM users WHERE id IN (${placeholders})
  `, userIds);

  return rows
    .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    .map((u, i) => ({
      userId:     u.id,
      name:       u.name,
      avatarUrl:  u.avatar_url,
      color:      u.color,
      tilesOwned: u.tiles_owned,
      rank:       i + 1,
    }));
}

// Rebuild Redis leaderboard from PostgreSQL (called on cold start)
export async function rebuildLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const { rows } = await pool.query(`
    SELECT id, name, avatar_url, color, tiles_owned
    FROM users WHERE tiles_owned > 0
    ORDER BY tiles_owned DESC LIMIT $1
  `, [limit]);

  if (rows.length > 0) {
    const args: (string | number)[] = [];
    rows.forEach(u => args.push(u.tiles_owned, u.id));
    await (redis.zadd as any)('leaderboard', ...args);
  }

  return rows.map((u, i) => ({
    userId:     u.id,
    name:       u.name,
    avatarUrl:  u.avatar_url,
    color:      u.color,
    tilesOwned: u.tiles_owned,
    rank:       i + 1,
  }));
}
