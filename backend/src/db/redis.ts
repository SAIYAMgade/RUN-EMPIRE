import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isRemote = redisUrl.startsWith('rediss://');

const redisOptions = {
  maxRetriesPerRequest: null,
  tls: isRemote ? { rejectUnauthorized: false } : undefined,
};

// Standard Redis client for commands and cache
export const redis = new Redis(redisUrl, redisOptions);

// Pub/Sub clients for Socket.io scaling
export const pubClient = new Redis(redisUrl, redisOptions);

export const subClient = new Redis(redisUrl, redisOptions);

redis.on('connect', () => console.log('✅ Redis connected successfully'));
redis.on('error', (err) => console.error('❌ Redis Connection Error:', err));

