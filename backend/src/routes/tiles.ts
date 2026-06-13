import { Router } from 'express';
import { getTileSnapshot } from '../services/cacheService';

const router = Router();

// GET /api/tiles/state - Return full grid snapshot
router.get('/state', async (req, res) => {
  try {
    const snapshot = await getTileSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('Failed to get tile snapshot:', err);
    res.status(500).json({ error: 'Failed to retrieve tile snapshot' });
  }
});

export default router;
