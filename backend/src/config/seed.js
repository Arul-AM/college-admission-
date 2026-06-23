require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./database');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create admin user
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const adminRes = await client.query(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES ('admin', $1, 'System Administrator', 'admin')
      ON CONFLICT (username) DO UPDATE SET password_hash = $1
      RETURNING id;
    `, [adminHash]);
    const adminId = adminRes.rows[0].id;

    // Create staff users for each stage
    const staffHash = await bcrypt.hash('Staff@123', 12);
    const stages = [
      { username: 'staff1', name: 'Stage 1 Staff - Document Verification', stage: 1 },
      { username: 'staff2', name: 'Stage 2 Staff - Certificate Verification', stage: 2 },
      { username: 'staff3', name: 'Stage 3 Staff - Online Verification', stage: 3 },
      { username: 'staff4', name: 'Stage 4 Staff - Admission Verification', stage: 4 },
      { username: 'staff5', name: 'Stage 5 Staff - Admission Completion', stage: 5 },
      { username: 'staff6', name: 'Stage 6 Staff - Help Desk', stage: 6 },
    ];

    for (const s of stages) {
      await client.query(`
        INSERT INTO users (username, password_hash, full_name, role, stage_assigned, created_by)
        VALUES ($1, $2, $3, 'staff', $4, $5)
        ON CONFLICT (username) DO NOTHING;
      `, [s.username, staffHash, s.name, s.stage, adminId]);
    }

    // Create departments
    const departments = [
      { name: 'Computer Science Engineering', code: 'CSE' },
      { name: 'Electrical and Electronics Engineering', code: 'EEE' },
      { name: 'Electronics and Communication Engineering', code: 'ECE' },
      { name: 'Mechanical Engineering', code: 'MECH' },
      { name: 'Civil Engineering', code: 'CIVIL' },
      { name: 'Information Technology', code: 'IT' },
    ];

    for (const dept of departments) {
      await client.query(`
        INSERT INTO departments (name, code)
        VALUES ($1, $2)
        ON CONFLICT (code) DO NOTHING;
      `, [dept.name, dept.code]);
    }

    // Create admission days
    const days = ['D1', 'D2', 'D3', 'D4'];
    for (let i = 0; i < days.length; i++) {
      await client.query(`
        INSERT INTO admission_days (name, is_active)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING;
      `, [days[i], i === 0]); // D1 active by default
    }

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully!');
    console.log('');
    console.log('📋 Login Credentials:');
    console.log('  Admin:  admin / Admin@123');
    console.log('  Staff1: staff1 / Staff@123  (Stage 1 - Document Verification)');
    console.log('  Staff2: staff2 / Staff@123  (Stage 2 - Certificate Verification)');
    console.log('  Staff3: staff3 / Staff@123  (Stage 3 - Online Verification)');
    console.log('  Staff4: staff4 / Staff@123  (Stage 4 - Admission Verification)');
    console.log('  Staff5: staff5 / Staff@123  (Stage 5 - Admission Completion)');
    console.log('  Staff6: staff6 / Staff@123  (Stage 6 - Help Desk)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch(() => process.exit(1));
