const { query } = require('../config/database');
const { auditLog, getClientIP } = require('../utils/audit');

const getAllDays = async (req, res) => {
  try {
    const result = await query('SELECT * FROM admission_days ORDER BY name');
    res.json({ days: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getActiveDay = async (req, res) => {
  try {
    const result = await query('SELECT * FROM admission_days WHERE is_active = true LIMIT 1');
    res.json({ activeDay: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const setActiveDay = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await require('../config/database').getClient();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE admission_days SET is_active = false, updated_at = NOW()');
      const result = await client.query(
        'UPDATE admission_days SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );
      if (!result.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Admission day not found' });
      }
      await client.query('COMMIT');

      await auditLog({
        userId: req.user.id, username: req.user.username,
        action: 'ADMISSION_DAY_SET',
        description: `Admin set active admission day to: ${result.rows[0].name}`,
        entityType: 'admission_day', entityId: id, ipAddress: getClientIP(req),
      });

      res.json({ day: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const createDay = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = await query(
      'INSERT INTO admission_days (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
      [name.toUpperCase()]
    );
    if (!result.rows.length) return res.status(409).json({ error: 'Day already exists' });

    res.status(201).json({ day: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllDays, getActiveDay, setActiveDay, createDay };
