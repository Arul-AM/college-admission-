const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, username, full_name, role, stage_assigned, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please login again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireStage = (...stages) => (req, res, next) => {
  const { role, stage_assigned } = req.user;
  if (role === 'admin') return next();
  if (stages.includes(stage_assigned)) return next();
  return res.status(403).json({
    error: `Access denied. This action requires stage ${stages.join(' or ')} access.`
  });
};

const canRegisterStudents = (req, res, next) => {
  const { role, stage_assigned } = req.user;
  if (role === 'admin') return next();
  if (stage_assigned === 1) return next();
  return res.status(403).json({
    error: 'Forbidden: Only Admin and Stage 1 staff can register students.'
  });
};

module.exports = { authenticate, requireAdmin, requireStage, canRegisterStudents };
