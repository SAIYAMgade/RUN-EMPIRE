import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { pool } from './db/pool';
import { createSocketServer } from './socket/socketServer';
import tilesRouter from './routes/tiles';
import leaderboardRouter from './routes/leaderboard';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import { isOriginAllowed } from './utils/cors';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

// Setup CORS
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

app.use(express.json());

// REST Routes
app.use('/api/auth', authRouter);
app.use('/api/tiles', tilesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/users', usersRouter);

// Mock login endpoint for easy development and multiplayer testing
app.post('/api/auth/mock-login', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Pre-defined mock colors and details
  const mockConfigs: Record<string, { color: string; avatarUrl: string }> = {
    'Ramesh': { color: '#EF4444', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ramesh' },
    'Priya':  { color: '#10B981', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Priya' },
    'Amit':   { color: '#3B82F6', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Amit' },
    'Pooja':  { color: '#F59E0B', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pooja' },
    'Vikram': { color: '#8B5CF6', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Vikram' },
  };

  const config = mockConfigs[name] || {
    color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`
  };

  try {
    const googleId = `mock_${name.toLowerCase()}`;
    const email = `${name.toLowerCase()}@mock-terrirun.com`;

    // Insert or update mock user in DB
    const { rows } = await pool.query(
      `INSERT INTO users (google_id, email, name, avatar_url, color)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name) 
       DO UPDATE SET name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
       RETURNING id, google_id as "googleId", email, name, avatar_url as "avatarUrl", color, tiles_owned as "tilesOwned", total_claimed as "totalClaimed"`,
      [googleId, email, name, config.avatarUrl, config.color]
    );

    const user = rows[0];

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.avatarUrl,
        color: user.color,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ user, token });
  } catch (err) {
    console.error('Mock login failed:', err);
    res.status(500).json({ error: 'Mock login failed' });
  }
});

// Start server and initialize Socket.io
createSocketServer(server)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 TerriRun Backend Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start Socket.io server:', err);
  });
