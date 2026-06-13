import { pool } from '../src/db/pool';

const DELHI_NCR = { north: 28.88, south: 28.40, west: 76.84, east: 77.35 };
const GRID = 50;
const latStep = (DELHI_NCR.north - DELHI_NCR.south) / GRID;
const lngStep = (DELHI_NCR.east - DELHI_NCR.west) / GRID;

async function setupDatabase() {
  console.log('🔄 Initializing database schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create USERS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        google_id       VARCHAR(255) UNIQUE,
        email           VARCHAR(255) UNIQUE,
        name            VARCHAR(255) UNIQUE NOT NULL,
        password_hash   VARCHAR(255),
        avatar_url      TEXT,
        color           VARCHAR(7) NOT NULL DEFAULT '#6366F1',
        tiles_owned     INTEGER NOT NULL DEFAULT 0,
        total_claimed   INTEGER NOT NULL DEFAULT 0,
        total_stolen    INTEGER NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_active     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS users_tiles_owned_idx ON users(tiles_owned DESC);');

    // Create TILES table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tiles (
        id          SERIAL PRIMARY KEY,
        row_idx     SMALLINT NOT NULL CHECK (row_idx BETWEEN 0 AND 49),
        col_idx     SMALLINT NOT NULL CHECK (col_idx BETWEEN 0 AND 49),
        tile_key    VARCHAR(8) NOT NULL UNIQUE,
        center_lat  DECIMAL(9, 6) NOT NULL,
        center_lng  DECIMAL(9, 6) NOT NULL,
        owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
        owner_color VARCHAR(7),
        owner_name  VARCHAR(255),
        claimed_at  TIMESTAMPTZ,
        claim_count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(row_idx, col_idx)
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS tiles_owner_idx ON tiles(owner_id);');
    await client.query('CREATE INDEX IF NOT EXISTS tiles_claimed_idx ON tiles(claimed_at DESC);');

    // Create EVENTS LOG table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events_log (
        id            BIGSERIAL PRIMARY KEY,
        tile_key      VARCHAR(8) NOT NULL,
        action        VARCHAR(20) NOT NULL,
        new_owner_id  UUID REFERENCES users(id) ON DELETE SET NULL,
        new_owner_name VARCHAR(255),
        new_owner_color VARCHAR(7),
        old_owner_id  UUID REFERENCES users(id) ON DELETE SET NULL,
        old_owner_name VARCHAR(255),
        triggered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS events_log_time_idx ON events_log(triggered_at DESC);');
    await client.query('CREATE INDEX IF NOT EXISTS events_log_new_owner_idx ON events_log(new_owner_id, triggered_at DESC);');

    await client.query('COMMIT');
    console.log('✅ Database tables and indices initialized');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to initialize database schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function seedGrid() {
  await setupDatabase();

  const client = await pool.connect();
  try {
    // Check if seeded
    const { rows } = await client.query('SELECT COUNT(*) FROM tiles');
    const count = parseInt(rows[0].count);
    if (count === GRID * GRID) {
      console.log(`ℹ️ Grid already seeded with ${count} tiles.`);
      return;
    }

    console.log('🌱 Seeding 2500 tiles for Delhi NCR...');
    await client.query('BEGIN');

    const values: any[] = [];
    let valueIdx = 1;
    const valuePlaceholders: string[] = [];

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const S = DELHI_NCR.south + r * latStep;
        const N = S + latStep;
        const W = DELHI_NCR.west + c * lngStep;
        const E = W + lngStep;

        const tileKey = `r${String(r).padStart(2,'0')}c${String(c).padStart(2,'0')}`;
        const centerLat = (N+S)/2;
        const centerLng = (E+W)/2;

        values.push(r, c, tileKey, centerLat, centerLng);
        valuePlaceholders.push(`($${valueIdx}, $${valueIdx+1}, $${valueIdx+2}, $${valueIdx+3}, $${valueIdx+4})`);
        valueIdx += 5;
      }
    }

    const queryText = `
      INSERT INTO tiles (row_idx, col_idx, tile_key, center_lat, center_lng)
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (tile_key) DO NOTHING
    `;

    await client.query(queryText, values);
    await client.query('COMMIT');
    console.log('✅ 2500 tiles seeded for Delhi NCR successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to seed tiles grid:', err);
  } finally {
    client.release();
  }
}

seedGrid()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
