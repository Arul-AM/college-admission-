require('dotenv').config();
const { Pool } = require('pg');

// Support both DATABASE_URL (connection string) and individual vars
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false'
        ? false
        : { rejectUnauthorized: false }, // required by most cloud providers (Render, Railway, Supabase, Heroku)
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'college_admission_db',
      user:     process.env.DB_USER     || 'admission_user',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    };

const pool = new Pool({
  ...poolConfig,
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 10000, // 10s — cloud DBs can be slow to wake
  allowExitOnIdle: false,
});

// Log connection errors without crashing the process
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

// Test connection on startup with retry
const connectWithRetry = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() AS now');
      client.release();
      console.log(`[DB] Connected successfully at ${result.rows[0].now}`);
      return;
    } catch (err) {
      console.error(`[DB] Connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`[DB] Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error('[DB] All connection attempts failed. Exiting.');
        process.exit(1);
      }
    }
  }
};

connectWithRetry();

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
