require('dotenv').config();
const { pool } = require('./database');

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
        stage_assigned INTEGER CHECK (stage_assigned BETWEEN 1 AND 6),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by UUID REFERENCES users(id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admission_days (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(10) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS preloaded_students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        allotment_number VARCHAR(50) NOT NULL,
        student_name VARCHAR(150) NOT NULL,
        dept_name VARCHAR(150) NOT NULL,
        dept_code VARCHAR(20) NOT NULL,
        course VARCHAR(100),
        admission_day VARCHAR(10) NOT NULL,
        admission_round VARCHAR(10) NOT NULL CHECK (admission_round IN ('R1','UP1','R2','UP2')),
        dept_serial INTEGER NOT NULL,
        base_token VARCHAR(60) NOT NULL,
        registered BOOLEAN DEFAULT false,
        registered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (allotment_number, admission_round)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_number VARCHAR(60) UNIQUE NOT NULL,
        allotment_number VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        department_id UUID REFERENCES departments(id) NOT NULL,
        department_code VARCHAR(20) NOT NULL,
        admission_day VARCHAR(10) NOT NULL,
        admission_round VARCHAR(10) NOT NULL CHECK (admission_round IN ('R1','UP1','R2','UP2')),
        fee_paid BOOLEAN DEFAULT false,
        current_stage INTEGER DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 6),
        admission_status VARCHAR(20) DEFAULT 'Pending' CHECK (admission_status IN ('Pending','In Progress','Completed','Rejected')),
        roll_number VARCHAR(20) UNIQUE,
        remarks TEXT,
        registered_by UUID REFERENCES users(id) NOT NULL,
        completed_by UUID REFERENCES users(id),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS token_sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admission_day VARCHAR(10) NOT NULL,
        admission_round VARCHAR(10) NOT NULL,
        department_code VARCHAR(20) NOT NULL,
        last_sequence INTEGER DEFAULT 0,
        UNIQUE(admission_day, admission_round, department_code)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stage_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id) NOT NULL,
        stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 6),
        action VARCHAR(20) NOT NULL CHECK (action IN ('approved','rejected','pending','fee_updated')),
        remarks TEXT,
        processed_by UUID REFERENCES users(id) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        username VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_token       ON students(token_number);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_allotment   ON students(allotment_number);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_stage       ON students(current_stage);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_status      ON students(admission_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stage_history_student ON stage_history(student_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user      ON audit_logs(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created   ON audit_logs(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_preloaded_allotment  ON preloaded_students(allotment_number);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_preloaded_day_round  ON preloaded_students(admission_day, admission_round);`);

    await client.query('COMMIT');
    console.log('✅ All tables created successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

createTables().catch(() => process.exit(1));
