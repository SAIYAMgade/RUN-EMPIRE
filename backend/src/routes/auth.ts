import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { hashPassword, verifyPassword } from '../utils/crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

// Presets of beautiful vibrant colors for territories
const COLORS = [
  '#EF4444', // Red
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
  '#10B981', // Green
];

// POST /api/auth/register - Create a new user with name and password
router.post('/register', async (req, res) => {
  const { name, password } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 3 || trimmedName.length > 20) {
    return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
  }

  // Allow letters, numbers, spaces, underscores, and hyphens
  if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName)) {
    return res.status(400).json({ error: 'Username can only contain alphanumeric characters, spaces, underscores, and hyphens' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Check if user already exists
    const checkUser = await pool.query(
      'SELECT id, password_hash as "passwordHash" FROM users WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );

    if (checkUser.rows.length > 0) {
      const existingUser = checkUser.rows[0];
      // If user has no password_hash set (legacy mock/OAuth user), let them register/set it now
      if (existingUser.passwordHash === null) {
        const passwordHash = hashPassword(password);
        const { rows } = await pool.query(
          `UPDATE users
           SET password_hash = $1
           WHERE id = $2
           RETURNING id, name, color, avatar_url as "avatarUrl", tiles_owned as "tilesOwned", total_claimed as "totalClaimed"`,
          [passwordHash, existingUser.id]
        );

        const user = rows[0];

        // Generate JWT
        const token = jwt.sign(
          {
            id: user.id,
            name: user.name,
            picture: user.avatarUrl,
            color: user.color,
            tilesOwned: user.tilesOwned,
            totalClaimed: user.totalClaimed,
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        return res.status(200).json({ user, token });
      }

      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Pick a random color
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Generate avatar URL
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedName)}`;

    // Insert user
    const { rows } = await pool.query(
      `INSERT INTO users (name, password_hash, color, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, color, avatar_url as "avatarUrl", tiles_owned as "tilesOwned", total_claimed as "totalClaimed"`,
      [trimmedName, passwordHash, color, avatarUrl]
    );

    const user = rows[0];

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        picture: user.avatarUrl,
        color: user.color,
        tilesOwned: user.tilesOwned,
        totalClaimed: user.totalClaimed,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Registration failed:', err);
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

// POST /api/auth/login - Authenticate with name and password
router.post('/login', async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Find user by name
    const { rows } = await pool.query(
      `SELECT id, name, password_hash as "passwordHash", color, avatar_url as "avatarUrl", tiles_owned as "tilesOwned", total_claimed as "totalClaimed"
       FROM users WHERE LOWER(name) = LOWER($1)`,
      [name.trim()]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Username does not exist. Toggle "Create one" below to register.' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'This account does not have a password set. Toggle "Create one" below to register.' });
    }

    // Verify password
    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        picture: user.avatarUrl,
        color: user.color,
        tilesOwned: user.tilesOwned,
        totalClaimed: user.totalClaimed,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Remove password hash before sending
    delete user.passwordHash;

    res.json({ user, token });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;
