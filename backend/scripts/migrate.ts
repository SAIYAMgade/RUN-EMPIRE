import { pool } from '../src/db/pool';

async function migrate() {
  console.log('🔄 Running database migrations for custom credentials...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Make google_id and email nullable
    await client.query('ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL');
    await client.query('ALTER TABLE users ALTER COLUMN email DROP NOT NULL');

    // 2. Add password_hash column if not exists
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)');

    // 3. Make name column UNIQUE
    // First remove existing unique constraint if any or add it safely
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_name_key');
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_name_unique');
    await client.query('ALTER TABLE users ADD CONSTRAINT users_name_unique UNIQUE (name)');

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Database migration failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
