require('dotenv').config();
const { pool } = require('./database');

const reset = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DROP TABLE IF EXISTS audit_logs CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS stage_history CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS token_sequences CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS students CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS admission_days CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS departments CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS users CASCADE;`);
    await client.query('COMMIT');
    console.log('✅ Database reset complete. Run npm run db:migrate and npm run db:seed next.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Reset failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
};

reset().catch(() => process.exit(1));
