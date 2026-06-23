const XLSX = require('xlsx');
const { query, getClient } = require('../config/database');

/**
 * Generate token in format: ADM-YY-DEPTCODE-001
 * Sequence resets per round + department
 */
const buildToken = (year, deptCode, seq) => {
  const yy = String(year).slice(-2);
  const paddedSeq = String(seq).padStart(3, '0');
  return `ADM-${yy}-${deptCode.toUpperCase()}-${paddedSeq}`;
};

/**
 * POST /api/tokens/generate-excel
 * Accepts Excel file + admission_round, returns Excel with tokens
 */
const generateFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    const { admission_round } = req.body;
    if (!admission_round) {
      return res.status(400).json({ error: 'admission_round is required (R1, UP1, R2, UP2)' });
    }

    const validRounds = ['R1', 'UP1', 'R2', 'UP2'];
    if (!validRounds.includes(admission_round)) {
      return res.status(400).json({ error: `Invalid round. Must be one of: ${validRounds.join(', ')}` });
    }

    // Parse Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Detect columns flexibly (case-insensitive)
    const firstRow = rows[0];
    const keys = Object.keys(firstRow);

    const findCol = (...names) =>
      keys.find(k => names.some(n => k.toLowerCase().includes(n.toLowerCase())));

    const allotmentCol = findCol('allotment', 'allot', 'app');
    const nameCol = findCol('name', 'student');
    const deptCol = findCol('dept', 'department', 'branch', 'code');

    if (!allotmentCol || !nameCol || !deptCol) {
      return res.status(400).json({
        error: 'Could not detect required columns. Make sure your Excel has columns for: Allotment Number, Student Name, Department Code',
        detectedColumns: keys,
      });
    }

    // Group students by department and sort by allotment number within each group
    const byDept = {};
    for (const row of rows) {
      const dept = String(row[deptCol] || '').trim().toUpperCase();
      if (!dept) continue;
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(row);
    }

    // Sort each dept group by allotment number
    for (const dept of Object.keys(byDept)) {
      byDept[dept].sort((a, b) => {
        const aVal = String(a[allotmentCol] || '').trim();
        const bVal = String(b[allotmentCol] || '').trim();
        return aVal.localeCompare(bVal, undefined, { numeric: true });
      });
    }

    const year = new Date().getFullYear();
    const client = await getClient();
    const outputRows = [];

    try {
      await client.query('BEGIN');

      for (const dept of Object.keys(byDept).sort()) {
        const students = byDept[dept];

        for (const student of students) {
          // Get next sequence for this round + dept atomically
          const seqResult = await client.query(`
            INSERT INTO token_sequences (admission_day, admission_round, department_code, last_sequence)
            VALUES ('EXCEL', $1, $2, 1)
            ON CONFLICT (admission_day, admission_round, department_code)
            DO UPDATE SET last_sequence = token_sequences.last_sequence + 1
            RETURNING last_sequence
          `, [admission_round, dept]);

          const seq = seqResult.rows[0].last_sequence;
          const token = buildToken(year, dept, seq);

          outputRows.push({
            'Token Number': token,
            'Allotment Number': String(student[allotmentCol] || '').trim(),
            'Student Name': String(student[nameCol] || '').trim(),
            'Department': dept,
            'Round': admission_round,
          });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Build output Excel
    const outWorkbook = XLSX.utils.book_new();
    const outSheet = XLSX.utils.json_to_sheet(outputRows);

    // Column widths
    outSheet['!cols'] = [
      { wch: 20 }, // Token Number
      { wch: 20 }, // Allotment Number
      { wch: 35 }, // Student Name
      { wch: 15 }, // Department
      { wch: 10 }, // Round
    ];

    XLSX.utils.book_append_sheet(outWorkbook, outSheet, 'Tokens');
    const buffer = XLSX.write(outWorkbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="tokens-${admission_round}-${Date.now()}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (err) {
    console.error('Token generation error:', err);
    res.status(500).json({ error: 'Failed to generate tokens', details: err.message });
  }
};

/**
 * POST /api/tokens/reset
 * Admin can reset sequences for a specific round (and optionally dept)
 */
const resetSequences = async (req, res) => {
  try {
    const { admission_round, department_code } = req.body;
    if (!admission_round) {
      return res.status(400).json({ error: 'admission_round is required' });
    }

    if (department_code) {
      await query(
        `DELETE FROM token_sequences WHERE admission_day = 'EXCEL' AND admission_round = $1 AND department_code = $2`,
        [admission_round, department_code.toUpperCase()]
      );
    } else {
      await query(
        `DELETE FROM token_sequences WHERE admission_day = 'EXCEL' AND admission_round = $1`,
        [admission_round]
      );
    }

    res.json({ message: `Sequences reset for round ${admission_round}${department_code ? ` / ${department_code}` : ''}` });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Failed to reset sequences' });
  }
};

module.exports = { generateFromExcel, resetSequences };
