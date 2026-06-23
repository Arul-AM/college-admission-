const { query } = require('../config/database');
const { auditLog, getClientIP } = require('../utils/audit');

const getAllDepartments = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM departments ORDER BY name'
    );
    res.json({ departments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getActiveDepartments = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM departments WHERE is_active = true ORDER BY name'
    );
    res.json({ departments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    const existing = await query(
      'SELECT id FROM departments WHERE code = $1 OR name = $2',
      [code.toUpperCase(), name]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Department with this name or code already exists' });
    }

    const result = await query(
      'INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *',
      [name, code.toUpperCase()]
    );

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: 'DEPARTMENT_CREATE',
      description: `Admin created department: ${name} (${code.toUpperCase()})`,
      entityType: 'department', entityId: result.rows[0].id,
      ipAddress: getClientIP(req),
    });

    res.status(201).json({ department: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, is_active } = req.body;

    const result = await query(`
      UPDATE departments SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
      WHERE id = $4 RETURNING *
    `, [name, code?.toUpperCase(), is_active, id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Department not found' });

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: 'DEPARTMENT_UPDATE',
      description: `Admin updated department: ${result.rows[0].name}`,
      entityType: 'department', entityId: id, ipAddress: getClientIP(req),
    });

    res.json({ department: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllDepartments, getActiveDepartments, createDepartment, updateDepartment };
