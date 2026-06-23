const { query } = require('../config/database');

const getDashboard = async (req, res) => {
  try {
    const [
      totals, stageCounts, recentActivity, completedToday
    ] = await Promise.all([
      query(`
        SELECT
          COUNT(*) as total_students,
          COUNT(*) FILTER (WHERE fee_paid = true) as fee_paid_count,
          COUNT(*) FILTER (WHERE fee_paid = false) as fee_pending_count,
          COUNT(*) FILTER (WHERE current_stage = 6) as help_desk_count,
          COUNT(*) FILTER (WHERE admission_status = 'Completed') as completed_count,
          COUNT(*) FILTER (WHERE admission_status = 'In Progress') as in_progress_count,
          COUNT(*) FILTER (WHERE admission_status = 'Rejected') as rejected_count
        FROM students
      `),
      query(`
        SELECT current_stage, COUNT(*) as count
        FROM students
        WHERE admission_status NOT IN ('Completed', 'Rejected')
        GROUP BY current_stage
        ORDER BY current_stage
      `),
      query(`
        SELECT al.action, al.description, al.created_at, al.username
        FROM audit_logs al
        ORDER BY al.created_at DESC
        LIMIT 10
      `),
      query(`
        SELECT COUNT(*) as count FROM students
        WHERE admission_status = 'Completed'
          AND DATE(completed_at) = CURRENT_DATE
      `),
    ]);

    const stageCountMap = {};
    for (let i = 1; i <= 6; i++) stageCountMap[i] = 0;
    stageCounts.rows.forEach(r => { stageCountMap[r.current_stage] = parseInt(r.count); });

    res.json({
      stats: totals.rows[0],
      stageCounts: stageCountMap,
      recentActivity: recentActivity.rows,
      completedToday: parseInt(completedToday.rows[0].count),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getStaffDashboard = async (req, res) => {
  try {
    const { stage_assigned } = req.user;
    const [queueCount, processedToday] = await Promise.all([
      query(
        `SELECT COUNT(*) as count FROM students WHERE current_stage = $1 AND admission_status NOT IN ('Completed','Rejected')`,
        [stage_assigned]
      ),
      query(
        `SELECT COUNT(*) as count FROM stage_history sh JOIN users u ON sh.processed_by = u.id
         WHERE u.id = $1 AND DATE(sh.created_at) = CURRENT_DATE`,
        [req.user.id]
      ),
    ]);

    res.json({
      stage: stage_assigned,
      queueCount: parseInt(queueCount.rows[0].count),
      processedToday: parseInt(processedToday.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Audit logs controller
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, username } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (action) { conditions.push(`action = $${idx++}`); params.push(action); }
    if (username) { conditions.push(`username ILIKE $${idx++}`); params.push(`%${username}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countRes = await query(`SELECT COUNT(*) FROM audit_logs ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      logs: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getDashboard, getStaffDashboard, getAuditLogs };
