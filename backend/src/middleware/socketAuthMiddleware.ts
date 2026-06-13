import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import type { User } from '../types';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  // 1. Check for mock user auth in development
  const mockUser = socket.handshake.auth?.mockUser;
  if (process.env.NODE_ENV !== 'production' && mockUser) {
    try {
      socket.data.user = typeof mockUser === 'string' ? JSON.parse(mockUser) : mockUser;
      return next();
    } catch (e) {
      return next(new Error('Invalid mock user auth payload'));
    }
  }

  // 2. Validate token
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: Missing token'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    socket.data.user = {
      id: decoded.id || decoded.sub,
      googleId: decoded.googleId || null,
      email: decoded.email || null,
      name: decoded.name,
      avatarUrl: decoded.avatarUrl || decoded.picture || '',
      color: decoded.color || '#6366F1',
      tilesOwned: decoded.tilesOwned || 0,
      totalClaimed: decoded.totalClaimed || 0,
    } as User;
    next();
  } catch (err) {
    console.error('Socket JWT Auth Error:', err);
    return next(new Error('Authentication error: Invalid token'));
  }
}
