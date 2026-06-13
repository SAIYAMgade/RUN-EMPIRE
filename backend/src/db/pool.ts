import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/terrirun';

const isRemote = connectionString.includes('neon.tech') || connectionString.includes('supabase') || process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString,
  max: 20, // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10 seconds connection timeout for remote WAN databases
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

// Test query
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL Database connection failed:', err.message);
  } else {
    console.log('✅ PostgreSQL Database connected successfully');
  }
});
