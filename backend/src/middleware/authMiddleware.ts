import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import type { User } from '../types';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

// Extend Request interface to include user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // 1. Check for local mock header in development
  const mockUserHeader = req.headers['x-mock-user'];
  if (process.env.NODE_ENV !== 'production' && mockUserHeader) {
    try {
      req.user = JSON.parse(mockUserHeader as string) as User;
      return next();
    } catch (e) {
      return res.status(400).json({ error: 'Invalid mock user header' });
    }
  }

  // 2. Extract authorization header or session cookie
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id || decoded.sub,
      googleId: decoded.googleId || null,
      email: decoded.email || null,
      name: decoded.name,
      avatarUrl: decoded.avatarUrl || decoded.picture || '',
      color: decoded.color || '#6366F1',
      tilesOwned: decoded.tilesOwned || 0,
      totalClaimed: decoded.totalClaimed || 0,
    };
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
