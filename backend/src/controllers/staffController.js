const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { auditLog, getClientIP } = require('../utils/audit');
const { STAGE_NAMES } = require('../utils/constants');

const getAllStaff = async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.username, u.full_name, u.role, u.stage_assigned, u.is_active,
             u.created_at, c.full_name as created_by_name
      FROM users u
      LEFT JOIN users c ON u.created_by = c.id
      WHERE u.role = 'staff'
      ORDER BY u.stage_assigned, u.full_name
    `);
    res.json({ staff: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const createStaff = async (req, res) => {
  try {
    const { username, password, full_name, stage_assigned } = req.body;

    if (!username || !password || !full_name || !stage_assigned) {
      return res.status(400).json({ error: 'All fields required: username, password, full_name, stage_assigned' });
    }

    if (stage_assigned < 1 || stage_assigned > 6) {
      return res.status(400).json({ error: 'Stage must be between 1 and 6' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await query(`
      INSERT INTO users (username, password_hash, full_name, role, stage_assigned, created_by)
      VALUES ($1, $2, $3, 'staff', $4, $5)
      RETURNING id, username, full_name, role, stage_assigned, is_active, created_at
    `, [username.toLowerCase(), hash, full_name, stage_assigned, req.user.id]);

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: 'STAFF_CREATE',
      description: `Admin created staff: ${username} for ${STAGE_NAMES[stage_assigned]}`,
      entityType: 'user', entityId: result.rows[0].id,
      ipAddress: getClientIP(req),
    });

    res.status(201).json({ staff: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, stage_assigned, is_active } = req.body;

    const existing = await query('SELECT id, username FROM users WHERE id = $1 AND role = $2', [id, 'staff']);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const result = await query(`
      UPDATE users SET full_name = COALESCE($1, full_name),
        stage_assigned = COALESCE($2, stage_assigned),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, username, full_name, role, stage_assigned, is_active
    `, [full_name, stage_assigned, is_active, id]);

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: 'STAFF_UPDATE',
      description: `Admin updated staff: ${existing.rows[0].username}`,
      entityType: 'user', entityId: id,
      ipAddress: getClientIP(req),
    });

    res.json({ staff: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      UPDATE users SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1 AND role = 'staff'
      RETURNING id, username, is_active
    `, [id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Staff not found' });

    const action = result.rows[0].is_active ? 'STAFF_ACTIVATE' : 'STAFF_DEACTIVATE';
    await auditLog({
      userId: req.user.id, username: req.user.username, action,
      description: `Admin ${result.rows[0].is_active ? 'activated' : 'deactivated'} staff: ${result.rows[0].username}`,
      entityType: 'user', entityId: id, ipAddress: getClientIP(req),
    });

    res.json({ staff: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await query('SELECT username FROM users WHERE id = $1 AND role = $2', [id, 'staff']);
    if (!existing.rows.length) return res.status(404).json({ error: 'Staff not found' });

    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, id]);

    await auditLog({
      userId: req.user.id, username: req.user.username,
      action: 'STAFF_RESET_PASSWORD',
      description: `Admin reset password for staff: ${existing.rows[0].username}`,
      entityType: 'user', entityId: id, ipAddress: getClientIP(req),
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllStaff, createStaff, updateStaff, toggleStaffStatus, resetStaffPassword };
