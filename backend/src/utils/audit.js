const { query } = require('../config/database');

const auditLog = async ({ userId, username, action, description, entityType, entityId, ipAddress }) => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, username, action, description, entity_type, entity_id, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId || null, username || null, action, description, entityType || null, entityId || null, ipAddress || null]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket?.remoteAddress || 'unknown';
};

module.exports = { auditLog, getClientIP };
