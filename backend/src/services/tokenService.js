const { query, getClient } = require('../config/database');

/**
 * Generates the next token in format: [Day]-[Round]-[DeptCode]-[Seq]
 * e.g., D1-R1-CSE-0001
 * Sequence resets per Day+Round+DeptCode combination
 */
const generateToken = async (admissionDay, admissionRound, departmentCode) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock the row for this combination and increment sequence atomically
    const result = await client.query(`
      INSERT INTO token_sequences (admission_day, admission_round, department_code, last_sequence)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (admission_day, admission_round, department_code)
      DO UPDATE SET last_sequence = token_sequences.last_sequence + 1
      RETURNING last_sequence
    `, [admissionDay, admissionRound, departmentCode]);

    const seq = result.rows[0].last_sequence;
    const paddedSeq = String(seq).padStart(4, '0');
    const token = `${admissionDay}-${admissionRound}-${departmentCode}-${paddedSeq}`;

    await client.query('COMMIT');
    return token;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { generateToken };
