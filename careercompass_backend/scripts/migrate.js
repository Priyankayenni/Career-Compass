// ── scripts/migrate.js — Run schema migrations ───────────────────────────────
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ── PRE-FLIGHT CHECKS ─────────────────────────────────────────────────────────
console.log('🔄 Running migrations...\n');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set.\n');
  console.error('Fix: open the .env file in the backend folder and add:');
  console.error('  DATABASE_URL=postgresql://user:password@host:5432/dbname\n');
  console.error('Where to get a free database URL:');
  console.error('  • Neon.tech  → https://neon.tech  (free, instant)');
  console.error('  • Supabase   → https://supabase.com (free, instant)');
  console.error('  • Railway    → https://railway.app  (add PostgreSQL plugin)\n');
  console.error('After adding it, run:  node scripts/migrate.js\n');
  process.exit(1);
}

// Mask password in logs for safety
const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
console.log('  Database:', maskedUrl);
console.log('  SSL:', process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled');
console.log('');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : process.env.DATABASE_URL.includes('neon.tech') ||
      process.env.DATABASE_URL.includes('supabase') ||
      process.env.DATABASE_URL.includes('railway')
      ? { rejectUnauthorized: false }   // cloud DBs always need SSL
      : false,
  connectionTimeoutMillis: 10000,
});

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to database\n');
  } catch (err) {
    console.error('❌ Cannot connect to database.\n');
    console.error('  Error:', err.message, '\n');
    console.error('Common causes:');
    console.error('  1. DATABASE_URL in .env is wrong or has typos');
    console.error('  2. The database does not exist yet (create it first)');
    console.error('  3. Password has special characters — wrap the URL in single quotes in .env');
    console.error('  4. Neon/Supabase/Railway URL needs ?sslmode=require at the end\n');
    console.error('Your current DATABASE_URL (masked):', maskedUrl, '\n');
    process.exit(1);
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schema);
    console.log('✅ Schema applied successfully\n');

    // Check table counts
    const tables = ['users', 'careers', 'roadmaps', 'posts', 'internships', 'test_attempts'];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ✓ ${table}: ${result.rows[0].count} rows`);
      } catch (_) {
        console.log(`   ✓ ${table}: created`);
      }
    }
  } catch (err) {
    console.error('\n❌ Schema error:', err.message);
    if (err.message.includes('already exists')) {
      console.error('  → Tables already exist. This is fine — the schema uses CREATE IF NOT EXISTS.');
      console.error('  → Try running again, or the DB is already set up correctly.\n');
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => { console.log('\n✅ Migration complete — backend is ready to start.'); process.exit(0); })
  .catch(err => {
    console.error('\n❌ Migration failed:', err.message || JSON.stringify(err));
    process.exit(1);
  });
