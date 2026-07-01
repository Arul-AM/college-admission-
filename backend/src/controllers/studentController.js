const { query, getClient } = require('../config/database');
const { auditLog, getClientIP } = require('../utils/audit');
const { generateToken } = require('../services/tokenService');
const { STAGE_FLOW, ADMISSION_STATUS } = require('../utils/constants');

// Register a new student
const registerStudent = async (req, res) => {
  const client = await getClient();
  try {
    const { allotment_number, student_name, department_id, admission_round, fee_paid, remarks } = req.body;

    if (!allotment_number || !student_name || !department_id || !admission_round) {
      return res.status(400).json({ error: 'allotment_number, student_name, department_id, admission_round are required' });
    }

    const validRounds = ['R1', 'UP1', 'R2', 'UP2'];
    if (!validRounds.includes(admission_round)) {
      return res.status(400).json({ error: 'Invalid admission round. Use R1, UP1, R2, or UP2' });
    }

    const dayResult = await query('SELECT name FROM admission_days WHERE is_active = true LIMIT 1');
    if (!dayResult.rows.length) {
      return res.status(400).json({ error: 'No active admission day configured. Contact admin.' });
    }
    const admissionDay = dayResult.rows[0].name;

    const deptResult = await query('SELECT * FROM departments WHERE id = $1 AND is_active = true', [department_id]);
    if (!deptResult.rows.length) {
      return res.status(404).json({ error: 'Department not found or inactive' });
    }
    const department = deptResult.rows[0];

    const preloaded = await query(
      `SELECT * FROM preloaded_students WHERE allotment_number=$1 AND admission_round=$2 AND admission_day=$3`,
      [allotment_number, admission_round, admissionDay]
    );

    let tokenNumber;
    if (preloaded.rows.length > 0) {
      const pl = preloaded.rows[0];
      const seqResult = await query(`
        INSERT INTO token_sequences (admission_day, admission_round, department_code, last_sequence)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (admission_day, admission_round, department_code)
        DO UPDATE SET last_sequence = token_sequences.last_sequence + 1
        RETURNING last_sequence
      `, [admissionDay, admission_round, pl.dept_code]);

      const reportingSerial = String(seqResult.rows[0].last_sequence).padStart(3, '0');
      tokenNumber = `${pl.base_token}-${reportingSerial}`;
    } else {
      tokenNumber = await generateToken(admissionDay, admission_round, department.code);
    }

    const feePaid = fee_paid === true || fee_paid === 'true';
    const initialStage = feePaid ? 1 : 6;

    await client.query('BEGIN');

    const studentResult = await client.query(`
      INSERT INTO students (
        token_number, allotment_number, student_name,
        department_id, department_code, admission_day,
        admission_round, fee_paid, current_stage,
        admission_status, remarks, registered_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [
      tokenNumber, allotment_number, student_name,
      department_id, department.code, admissionDay,
      admission_round, feePaid, initialStage,
      ADMISSION_STATUS.IN_PROGRESS, remarks || null, req.user.id
    ]);

    const student = studentResult.rows[0];

    await client.query(`
      INSERT INTO stage_history (student_id, stage_number, action, remarks, processed_by)
      VALUES ($1, $2, 'pending', $3, $4)
    `, [student.id, initialStage, remarks || 'Student registered', req.user.id]);

    await client.query(
      `UPDATE preloaded_students SET registered=true, registered_at=NOW() WHERE allotment_number=$1 AND admission_round=$2`,
      [allotment_number, admission_round]
    );

    await client.query('COMMIT');

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: 'STUDENT_REGISTER',
      description: `Registered student: ${student_name}, Token: ${tokenNumber}`,
      entityType: 'student', entityId: student.id,
      ipAddress: getClientIP(req),
    });

    res.status(201).json({
      message: 'Student registered successfully',
      student: { ...student, department_name: department.name },
      tokenNumber,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Register student error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// Get queue for a specific stage
const getStageQueue = async (req, res) => {
  try {
    const stageNum = parseInt(req.params.stage);
    if (isNaN(stageNum) || stageNum < 1 || stageNum > 6) {
      return res.status(400).json({ error: 'Invalid stage number' });
    }

    const { role, stage_assigned } = req.user;
    if (role === 'staff' && stage_assigned !== stageNum) {
      return res.status(403).json({ error: 'Access denied to this stage queue' });
    }

    const result = await query(`
      SELECT s.*, d.name as department_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      WHERE s.current_stage = $1
        AND s.admission_status NOT IN ('Completed', 'Rejected')
      ORDER BY s.created_at ASC
    `, [stageNum]);

    res.json({ students: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single student details
const getStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT s.*, d.name as department_name,
             u.full_name as registered_by_name,
             cb.full_name as completed_by_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      JOIN users u ON s.registered_by = u.id
      LEFT JOIN users cb ON s.completed_by = cb.id
      WHERE s.id = $1
    `, [id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Student not found' });

    const history = await query(`
      SELECT sh.*, u.full_name as processed_by_name, u.username as processed_by_username
      FROM stage_history sh
      JOIN users u ON sh.processed_by = u.id
      WHERE sh.student_id = $1
      ORDER BY sh.created_at ASC
    `, [id]);

    res.json({ student: result.rows[0], history: history.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Process student at a stage (approve/reject)
const processStage = async (req, res) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;
    const { role, stage_assigned } = req.user;

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approved or rejected' });
    }

    const result = await client.query(`
      SELECT s.*, d.name as department_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      WHERE s.id = $1
    `, [id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Student not found' });

    const student = result.rows[0];
    const currentStage = student.current_stage;

    if (role === 'staff' && stage_assigned !== currentStage) {
      return res.status(403).json({ error: `You can only process Stage ${stage_assigned} students` });
    }

    if (['Completed', 'Rejected'].includes(student.admission_status)) {
      return res.status(400).json({ error: 'Student record is locked (completed or rejected)' });
    }

    await client.query('BEGIN');

    let nextStage = currentStage;
    let newStatus = student.admission_status;

    if (action === 'approved') {
      const nextStageMap = STAGE_FLOW;
      if (nextStageMap[currentStage]) {
        nextStage = nextStageMap[currentStage];
      } else if (currentStage === 5) {
        return res.status(400).json({ error: 'Use the complete admission endpoint for Stage 5' });
      }
    } else {
      newStatus = ADMISSION_STATUS.REJECTED;
    }

    await client.query(`
      UPDATE students SET current_stage = $1, admission_status = $2,
        remarks = COALESCE($3, remarks), updated_at = NOW()
      WHERE id = $4
    `, [nextStage, newStatus, remarks, id]);

    await client.query(`
      INSERT INTO stage_history (student_id, stage_number, action, remarks, processed_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, currentStage, action, remarks || null, req.user.id]);

    await client.query('COMMIT');

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: `STAGE_${action.toUpperCase()}`,
      description: `Stage ${currentStage} ${action} for ${student.student_name} (${student.token_number})${nextStage !== currentStage ? ` → Stage ${nextStage}` : ''}`,
      entityType: 'student', entityId: id, ipAddress: getClientIP(req),
    });

    res.json({ message: `Student ${action} successfully`, nextStage, newStatus });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Process stage error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// Assign roll number and complete admission (Stage 5 only)
const completeAdmission = async (req, res) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { roll_number } = req.body;
    const { role, stage_assigned } = req.user;

    if (role === 'staff' && stage_assigned !== 5) {
      return res.status(403).json({ error: 'Only Stage 5 staff can complete admissions' });
    }

    if (!roll_number || !roll_number.trim()) {
      return res.status(400).json({ error: 'Roll number is required' });
    }

    const rollNum = roll_number.trim().toUpperCase();

    const rollCheck = await client.query(
      'SELECT id FROM students WHERE roll_number = $1 AND id != $2',
      [rollNum, id]
    );
    if (rollCheck.rows.length) {
      return res.status(409).json({ error: 'Roll number already assigned to another student' });
    }

    const result = await client.query('SELECT * FROM students WHERE id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Student not found' });

    const student = result.rows[0];
    if (student.current_stage !== 5) {
      return res.status(400).json({ error: 'Student must be in Stage 5 to complete admission' });
    }
    if (student.admission_status === 'Completed') {
      return res.status(400).json({ error: 'Admission already completed' });
    }

    await client.query('BEGIN');

    await client.query(`
      UPDATE students SET
        roll_number = $1,
        admission_status = 'Completed',
        completed_by = $2,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
    `, [rollNum, req.user.id, id]);

    await client.query(`
      INSERT INTO stage_history (student_id, stage_number, action, remarks, processed_by)
      VALUES ($1, 5, 'approved', $2, $3)
    `, [id, `Admission completed. Roll number: ${rollNum}`, req.user.id]);

    await client.query('COMMIT');

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: 'ADMISSION_COMPLETE',
      description: `Admission completed for ${student.student_name} (${student.token_number}), Roll: ${rollNum}`,
      entityType: 'student', entityId: id, ipAddress: getClientIP(req),
    });

    res.json({ message: 'Admission completed successfully', roll_number: rollNum });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Complete admission error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// Update fee status (Stage 6)
const updateFeeStatus = async (req, res) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const { role, stage_assigned } = req.user;

    if (role === 'staff' && stage_assigned !== 6) {
      return res.status(403).json({ error: 'Only Stage 6 (Help Desk) staff can update fee status' });
    }

    const result = await client.query('SELECT * FROM students WHERE id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Student not found' });

    const student = result.rows[0];
    if (student.fee_paid) {
      return res.status(400).json({ error: 'Fee is already marked as paid' });
    }
    if (student.current_stage !== 6) {
      return res.status(400).json({ error: 'Student must be in Stage 6 (Help Desk) to update fee' });
    }

    await client.query('BEGIN');

    await client.query(`
      UPDATE students SET fee_paid = true, current_stage = 1, updated_at = NOW()
      WHERE id = $1
    `, [id]);

    await client.query(`
      INSERT INTO stage_history (student_id, stage_number, action, remarks, processed_by)
      VALUES ($1, 6, 'fee_updated', $2, $3)
    `, [id, remarks || 'Fee payment confirmed. Moved to Stage 1.', req.user.id]);

    await client.query('COMMIT');

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: 'FEE_UPDATE',
      description: `Fee marked as paid for ${student.student_name} (${student.token_number}). Moved to Stage 1.`,
      entityType: 'student', entityId: id, ipAddress: getClientIP(req),
    });

    res.json({ message: 'Fee updated. Student moved to Stage 1.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update fee error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// Search students
const searchStudents = async (req, res) => {
  try {
    const {
      q, token_number, allotment_number, student_name, roll_number,
      department_code, admission_day, admission_round, current_stage,
      admission_status, page = 1, limit = 20,
    } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    const addCondition = (col, val, exact = false) => {
      if (val) {
        if (exact) {
          conditions.push(`${col} = $${idx++}`);
          params.push(val);
        } else {
          conditions.push(`${col} ILIKE $${idx++}`);
          params.push(`%${val}%`);
        }
      }
    };

    if (q) {
      conditions.push(`(s.token_number ILIKE $${idx} OR s.student_name ILIKE $${idx} OR s.allotment_number ILIKE $${idx} OR s.roll_number ILIKE $${idx})`);
      params.push(`%${q}%`);
      idx++;
    }

    addCondition('s.token_number', token_number);
    addCondition('s.allotment_number', allotment_number);
    addCondition('s.student_name', student_name);
    addCondition('s.roll_number', roll_number);
    addCondition('s.department_code', department_code?.toUpperCase(), true);
    addCondition('s.admission_day', admission_day, true);
    addCondition('s.admission_round', admission_round, true);
    if (current_stage) { conditions.push(`s.current_stage = $${idx++}`); params.push(parseInt(current_stage)); }
    addCondition('s.admission_status', admission_status, true);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await query(
      `SELECT COUNT(*) FROM students s ${where}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await query(`
      SELECT s.*, d.name as department_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      ${where}
      ORDER BY s.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, params);

    res.json({
      students: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Export students as CSV
const exportStudents = async (req, res) => {
  try {
    const result = await query(`
      SELECT s.token_number, s.allotment_number, s.student_name,
             d.name as department, s.department_code, s.admission_day,
             s.admission_round, s.fee_paid, s.current_stage, s.admission_status,
             s.roll_number, s.remarks, s.created_at, s.completed_at
      FROM students s
      JOIN departments d ON s.department_id = d.id
      ORDER BY s.created_at DESC
    `);

    const headers = [
      'Token Number', 'Allotment Number', 'Student Name', 'Department', 'Dept Code',
      'Admission Day', 'Admission Round', 'Fee Paid', 'Current Stage', 'Admission Status',
      'Roll Number', 'Remarks', 'Registered At', 'Completed At'
    ].join(',');

    const rows = result.rows.map(r => [
      r.token_number, r.allotment_number, `"${r.student_name}"`,
      `"${r.department}"`, r.department_code, r.admission_day, r.admission_round,
      r.fee_paid ? 'Yes' : 'No', r.current_stage, r.admission_status,
      r.roll_number || '', `"${(r.remarks || '').replace(/"/g, '""')}"`,
      r.created_at?.toISOString() || '', r.completed_at?.toISOString() || ''
    ].join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
    res.send(`${headers}\n${rows}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── Delete single student (Admin only) ───────────────────────
const deleteStudent = async (req, res) => {
  const client = await getClient();
  try {
    const { id } = req.params;

    const result = await client.query('SELECT * FROM students WHERE id = $1', [id]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = result.rows[0];

    // Prevent deleting completed admissions
    if (student.admission_status === 'Completed') {
      return res.status(400).json({ error: 'Cannot delete a completed admission record' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM stage_history WHERE student_id = $1', [id]);
    await client.query('DELETE FROM students WHERE id = $1', [id]);
    await client.query('COMMIT');

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: 'STUDENT_REGISTER',
      description: `Student deleted: ${student.student_name} (${student.token_number})`,
      entityType: 'student', entityId: id, ipAddress: getClientIP(req),
    });

    res.json({ message: `Student ${student.student_name} deleted successfully` });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// ── Clear all student data (Admin only) ───────────────────────
const clearAllStudents = async (req, res) => {
  try {
    const { confirmText } = req.body;

    if (confirmText !== 'CLEAR ALL DATA') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation text does not match. Type exactly: CLEAR ALL DATA',
      });
    }

    const countResult = await query('SELECT COUNT(*) FROM students');
    const studentCount = parseInt(countResult.rows[0].count);

    await query('TRUNCATE TABLE stage_history CASCADE');
    await query('TRUNCATE TABLE token_sequences CASCADE');
    await query('TRUNCATE TABLE preloaded_students CASCADE');
    await query('DELETE FROM students');

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: 'STUDENT_REGISTER',
      description: `All student data cleared by admin — ${studentCount} records removed`,
      ipAddress: getClientIP(req),
    });

    return res.json({
      success: true,
      message: `Successfully cleared ${studentCount} student record(s).`,
      studentsRemoved: studentCount,
    });
  } catch (err) {
    console.error('Clear students error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  registerStudent, getStageQueue, getStudent,
  processStage, completeAdmission, updateFeeStatus,
  searchStudents, exportStudents,
  deleteStudent, clearAllStudents,
};