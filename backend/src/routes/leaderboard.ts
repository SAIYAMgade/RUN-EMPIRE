import { Router } from 'express';
import { getLeaderboard } from '../services/leaderboardService';

const router = Router();

// GET /api/leaderboard - Return top 10 users ranked by tiles owned
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const board = await getLeaderboard(limit);
    res.json(board);
  } catch (err) {
    console.error('Failed to get leaderboard:', err);
    res.status(500).json({ error: 'Failed to retrieve leaderboard' });
  }
});

export default router;
