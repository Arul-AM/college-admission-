require('dotenv').config();
const { pool } = require('./src/config/database');

const fix = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Increase department_code column size in token_sequences
    await client.query(`ALTER TABLE token_sequences ALTER COLUMN department_code TYPE VARCHAR(100);`);
    console.log('✅ token_sequences.department_code → VARCHAR(100)');

    // Also fix preloaded_students dept_code just in case
    await client.query(`ALTER TABLE preloaded_students ALTER COLUMN dept_code TYPE VARCHAR(100);`);
    console.log('✅ preloaded_students.dept_code → VARCHAR(100)');

    // Also fix students.department_code
    await client.query(`ALTER TABLE students ALTER COLUMN department_code TYPE VARCHAR(100);`);
    console.log('✅ students.department_code → VARCHAR(100)');

    await client.query('COMMIT');
    console.log('\n🎉 All column sizes fixed! Try generating tokens now.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
};

fix();
