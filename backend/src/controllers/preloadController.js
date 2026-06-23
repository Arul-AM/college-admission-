/**
 * preloadController.js
 * 
 * Admin uploads Excel → students are pre-loaded with dept serial token part
 * Format: D2-R1-CSE-012  (dept serial from Excel order)
 * When staff registers student: D2-R1-CSE-012-005  (005 = reporting order that day)
 */

const XLSX = require('xlsx');
const { query, getClient } = require('../config/database');

// ─── Helper: normalize dept name → short code ────────────────────────────────
const DEPT_CODE_MAP = {
  'COMPUTER SCIENCE AND ENGINEERING': 'CSE',
  'ELECTRONICS AND COMMUNICATION ENGINEERING': 'ECE',
  'ELECTRICAL AND ELECTRONICS ENGINEERING': 'EEE',
  'MECHANICAL ENGINEERING': 'MECH',
  'CIVIL ENGINEERING': 'CIVIL',
  'INFORMATION TECHNOLOGY': 'IT',
  'INFORMATION TECHNOLOGY (SS)': 'IT',
  'BIO MEDICAL ENGINEERING': 'BME',
  'ELECTRONICS ENGINEERING (VLSI DESIGN AND TECHNOLOGY)': 'VLSI',
  'GEO INFORMATICS': 'GEO',
  'INDUSTRIAL ENGINEERING': 'IE',
  'MANUFACTURING ENGINEERING': 'MFG',
  'MATERIALS SCIENCE AND ENGINEERING': 'MSE',
  'MINING ENGINEERING': 'MINE',
};

const getDeptCode = (deptName) => {
  const upper = (deptName || '').toUpperCase().trim();
  if (DEPT_CODE_MAP[upper]) return DEPT_CODE_MAP[upper];
  // Fallback: take first letters of each word, max 5 chars
  return upper.split(' ').map(w => w[0]).join('').slice(0, 5);
};

// ─── POST /api/preload/upload ─────────────────────────────────────────────────
// Admin uploads Excel, selects day + round → students pre-loaded into DB
const uploadStudents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No Excel file uploaded' });

    const { admission_day, admission_round } = req.body;
    if (!admission_day || !admission_round) {
      return res.status(400).json({ error: 'admission_day and admission_round are required' });
    }
    if (!['R1','UP1','R2','UP2'].includes(admission_round)) {
      return res.status(400).json({ error: 'Invalid round. Must be R1, UP1, R2, or UP2' });
    }

    // Parse Excel
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length) return res.status(400).json({ error: 'Excel file is empty' });

    // Detect columns
    const keys = Object.keys(rows[0]);
    const findCol = (...names) => keys.find(k => names.some(n => k.toLowerCase().includes(n.toLowerCase())));

    const allotCol  = findCol('allotment', 'allot', 'app no', 'appno');
    const nameCol   = findCol('name', 'student');
    const deptCol   = findCol('dept', 'department', 'branch');
    const courseCol = findCol('course', 'degree', 'program');

    if (!allotCol || !nameCol || !deptCol) {
      return res.status(400).json({
        error: 'Could not detect columns. Need: allotment no, name, department',
        detectedColumns: keys,
      });
    }

    // Group by dept, preserve Excel row order within each dept
    const byDept = {};
    for (const row of rows) {
      const dept = String(row[deptCol] || '').trim();
      if (!dept) continue;
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push({
        allotment_number: String(row[allotCol] || '').trim(),
        student_name:     String(row[nameCol]  || '').trim(),
        course:           courseCol ? String(row[courseCol] || '').trim() : '',
        dept_name:        dept,
        dept_code:        getDeptCode(dept),
      });
    }

    const client = await getClient();
    const results = { inserted: 0, skipped: 0, errors: [] };
    const preview = [];

    try {
      await client.query('BEGIN');

      // Check if any preloaded students exist for this day+round (warn but allow)
      const existing = await client.query(
        `SELECT COUNT(*) FROM preloaded_students WHERE admission_day=$1 AND admission_round=$2`,
        [admission_day, admission_round]
      );
      if (parseInt(existing.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Students already preloaded for ${admission_day} / ${admission_round}. Use DELETE /api/preload/clear to reset first.`,
          existingCount: parseInt(existing.rows[0].count),
        });
      }

      // Insert per dept, in Excel order → assign dept_serial
      for (const [deptName, students] of Object.entries(byDept)) {
        const deptCode = getDeptCode(deptName);
        students.forEach((s, idx) => {
          s.dept_serial = idx + 1;
          // Base token (without reporting number): D2-R1-CSE-012
          s.base_token = `${admission_day}-${admission_round}-${deptCode}-${String(idx + 1).padStart(3, '0')}`;
        });

        for (const s of students) {
          if (!s.allotment_number || !s.student_name) {
            results.errors.push(`Skipped row: missing allotment or name`);
            results.skipped++;
            continue;
          }
          await client.query(`
            INSERT INTO preloaded_students
              (allotment_number, student_name, dept_name, dept_code, course,
               admission_day, admission_round, dept_serial, base_token)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (allotment_number, admission_round) DO NOTHING
          `, [
            s.allotment_number, s.student_name, s.dept_name, s.dept_code,
            s.course, admission_day, admission_round, s.dept_serial, s.base_token,
          ]);
          results.inserted++;
          preview.push({ base_token: s.base_token, allotment_number: s.allotment_number, student_name: s.student_name, dept_code: s.dept_code });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      message: `Preloaded ${results.inserted} students for ${admission_day} / ${admission_round}`,
      inserted: results.inserted,
      skipped:  results.skipped,
      errors:   results.errors,
      preview:  preview.slice(0, 10), // show first 10 as sample
      totalDepts: Object.keys(byDept).length,
      deptSummary: Object.entries(byDept).map(([name, s]) => ({
        dept: name,
        code: getDeptCode(name),
        count: s.length,
        range: `${getDeptCode(name)}-001 to ${getDeptCode(name)}-${String(s.length).padStart(3,'0')}`,
      })),
    });

  } catch (err) {
    console.error('Preload upload error:', err);
    res.status(500).json({ error: 'Failed to preload students', details: err.message });
  }
};

// ─── GET /api/preload/list ────────────────────────────────────────────────────
// Admin views all preloaded students for a day+round
const listPreloaded = async (req, res) => {
  try {
    const { admission_day, admission_round } = req.query;
    let sql = `SELECT * FROM preloaded_students`;
    const params = [];
    if (admission_day && admission_round) {
      sql += ` WHERE admission_day=$1 AND admission_round=$2`;
      params.push(admission_day, admission_round);
    } else if (admission_day) {
      sql += ` WHERE admission_day=$1`;
      params.push(admission_day);
    }
    sql += ` ORDER BY dept_code, dept_serial`;
    const result = await query(sql, params);
    res.json({ students: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── DELETE /api/preload/clear ────────────────────────────────────────────────
const clearPreloaded = async (req, res) => {
  try {
    const { admission_day, admission_round } = req.body;
    if (!admission_day || !admission_round) {
      return res.status(400).json({ error: 'admission_day and admission_round required' });
    }
    const result = await query(
      `DELETE FROM preloaded_students WHERE admission_day=$1 AND admission_round=$2 AND registered=false`,
      [admission_day, admission_round]
    );
    res.json({ message: `Cleared ${result.rowCount} unregistered preloaded students`, deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/preload/lookup/:allotment ───────────────────────────────────────
// Staff looks up student by allotment number during registration
const lookupByAllotment = async (req, res) => {
  try {
    const { allotment } = req.params;
    const { admission_round } = req.query;

    let sql = `SELECT * FROM preloaded_students WHERE allotment_number=$1`;
    const params = [allotment];
    if (admission_round) { sql += ` AND admission_round=$2`; params.push(admission_round); }

    const result = await query(sql, params);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Student not found in preloaded list' });
    }
    res.json({ student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { uploadStudents, listPreloaded, clearPreloaded, lookupByAllotment };
