const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/analytics/overview - KPI summary
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;

    const [ticketStats, convStats, msgStats, agentStats] = await Promise.all([
      // Ticket counts by status
      db.queryOne(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'open') as open,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) FILTER (WHERE status = 'closed') as closed,
          ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(first_response_at, NOW()) - created_at)) / 60) FILTER (WHERE first_response_at IS NOT NULL)) as avg_first_response_min,
          ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL)) as avg_resolution_hours
        FROM tickets WHERE user_id = $1`,
        [userId]
      ),
      // Conversation counts
      db.queryOne(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE channel = 'telegram') as telegram,
          COUNT(*) FILTER (WHERE channel = 'email') as email,
          COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '24 hours') as active_today
        FROM conversations WHERE user_id = $1`,
        [userId]
      ),
      // Message volume (last 30 days by day)
      db.queryAll(
        `SELECT DATE(created_at) as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE sender_type = 'user') as inbound,
          COUNT(*) FILTER (WHERE sender_type = 'agent') as outbound
        FROM messages
        WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = $1)
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date`,
        [userId]
      ),
      // Agent performance (if org exists)
      db.queryAll(
        `SELECT u.id, u.name, u.email,
          COUNT(DISTINCT c.id) as conversations_handled,
          COUNT(DISTINCT t.id) as tickets_assigned,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('resolved', 'closed')) as tickets_resolved
        FROM users u
        LEFT JOIN conversations c ON c.assigned_agent_id = u.id
        LEFT JOIN tickets t ON t.assigned_to = u.id
        WHERE u.organization_id = (SELECT organization_id FROM users WHERE id = $1)
          AND u.organization_id IS NOT NULL
        GROUP BY u.id, u.name, u.email
        ORDER BY conversations_handled DESC`,
        [userId]
      ),
    ]);

    res.json({
      success: true,
      tickets: ticketStats,
      conversations: convStats,
      message_volume: msgStats,
      agents: agentStats,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analytics/activity - Recent activity log
router.get('/activity', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const activities = await db.queryAll(
      `SELECT al.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as actor
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.organization_id = (SELECT organization_id FROM users WHERE id = $1)
         OR al.user_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [userId, parseInt(limit)]
    );

    res.json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
