require('dotenv').config();
const { pool } = require('./src/config/database');

const departments = [
  { name: 'BIO MEDICAL ENGINEERING', code: 'BME' },
  { name: 'CIVIL ENGINEERING', code: 'CIVIL' },
  { name: 'COMPUTER SCIENCE AND ENGINEERING', code: 'CSE' },
  { name: 'ELECTRICAL AND ELECTRONICS ENGINEERING', code: 'EEE' },
  { name: 'ELECTRONICS AND COMMUNICATION ENGINEERING', code: 'ECE' },
  { name: 'ELECTRONICS ENGINEERING (VLSI DESIGN AND TECHNOLOGY)', code: 'VLSI' },
  { name: 'GEO INFORMATICS', code: 'GEO' },
  { name: 'INDUSTRIAL ENGINEERING', code: 'IE' },
  { name: 'INFORMATION TECHNOLOGY (SS)', code: 'IT' },
  { name: 'MANUFACTURING ENGINEERING', code: 'MFGE' },
  { name: 'MATERIALS SCIENCE AND ENGINEERING', code: 'MSE' },
  { name: 'MECHANICAL ENGINEERING', code: 'MECH' },
  { name: 'MINING ENGINEERING', code: 'MINE' },
];

const run = async () => {
  const client = await pool.connect();
  try {
    // Delete old departments
    await client.query('DELETE FROM departments');
    console.log('🗑️  Old departments removed.');

    // Insert new departments
    for (const dept of departments) {
      await client.query(
        `INSERT INTO departments (name, code) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name = $1`,
        [dept.name, dept.code]
      );
      console.log(`✅ Added: ${dept.name} (${dept.code})`);
    }

    console.log('\n🎉 All 13 departments inserted successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
