const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tickets - List tickets with filters
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, assigned_to, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT t.*,
        json_build_object('id', c.id, 'name', c.name, 'email', c.email, 'telegram_id', c.telegram_id) as contact,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as assignee,
        json_build_object('id', cb.id, 'name', cb.name, 'email', cb.email) as creator
      FROM tickets t
      LEFT JOIN contacts c ON t.contact_id = c.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users cb ON t.created_by = cb.id
      WHERE t.user_id = $1
    `;
    const params = [userId];
    let paramIdx = 2;

    if (status) {
      query += ` AND t.status = $${paramIdx++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND t.priority = $${paramIdx++}`;
      params.push(priority);
    }
    if (assigned_to) {
      query += ` AND t.assigned_to = $${paramIdx++}`;
      params.push(assigned_to);
    }
    if (search) {
      query += ` AND (t.title ILIKE $${paramIdx} OR t.description ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ` ORDER BY
      CASE t.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'resolved' THEN 3 WHEN 'closed' THEN 4 END,
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
      t.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const tickets = await db.queryAll(query, params);

    // Get counts by status
    const counts = await db.queryOne(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'closed') as closed,
        COUNT(*) as total
       FROM tickets WHERE user_id = $1`,
      [userId]
    );

    res.json({ success: true, tickets, counts });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tickets/:id - Get ticket with comments
router.get('/:id', async (req, res) => {
  try {
    const ticket = await db.queryOne(
      `SELECT t.*,
        json_build_object('id', c.id, 'name', c.name, 'email', c.email, 'telegram_id', c.telegram_id) as contact,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as assignee,
        json_build_object('id', cb.id, 'name', cb.name, 'email', cb.email) as creator
       FROM tickets t
       LEFT JOIN contacts c ON t.contact_id = c.id
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN users cb ON t.created_by = cb.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const comments = await db.queryAll(
      `SELECT tc.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as author
       FROM ticket_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.ticket_id = $1
       ORDER BY tc.created_at ASC`,
      [req.params.id]
    );

    res.json({ success: true, ticket, comments });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tickets - Create ticket
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, conversation_id, contact_id, assigned_to, tags } = req.body;
    const userId = req.user.id;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    // If creating from conversation, auto-fill contact
    let finalContactId = contact_id;
    if (conversation_id && !finalContactId) {
      const conv = await db.queryOne(
        'SELECT contact_id FROM conversations WHERE id = $1 AND user_id = $2',
        [conversation_id, userId]
      );
      if (conv) finalContactId = conv.contact_id;
    }

    const ticket = await db.queryOne(
      `INSERT INTO tickets (title, description, priority, conversation_id, contact_id, assigned_to, created_by, user_id, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title,
        description || null,
        priority || 'medium',
        conversation_id || null,
        finalContactId || null,
        assigned_to || null,
        userId,
        userId,
        tags || '{}'
      ]
    );

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/tickets/:id - Update ticket
router.patch('/:id', async (req, res) => {
  try {
    const { status, priority, assigned_to, title, description, tags } = req.body;
    const userId = req.user.id;

    // Verify ownership
    const existing = await db.queryOne(
      'SELECT * FROM tickets WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(status);
      if (status === 'resolved' && !existing.resolved_at) {
        updates.push(`resolved_at = NOW()`);
      }
      if (status === 'closed' && !existing.closed_at) {
        updates.push(`closed_at = NOW()`);
      }
    }
    if (priority !== undefined) { updates.push(`priority = $${idx++}`); params.push(priority); }
    if (assigned_to !== undefined) { updates.push(`assigned_to = $${idx++}`); params.push(assigned_to || null); }
    if (title !== undefined) { updates.push(`title = $${idx++}`); params.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
    if (tags !== undefined) { updates.push(`tags = $${idx++}`); params.push(tags); }

    if (updates.length === 0) {
      return res.json({ success: true, ticket: existing });
    }

    params.push(req.params.id);
    const ticket = await db.queryOne(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tickets/:id/comments - Add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { text, is_internal } = req.body;
    const userId = req.user.id;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    // Verify ticket ownership
    const ticket = await db.queryOne(
      'SELECT id, first_response_at FROM tickets WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // Track first response
    if (!ticket.first_response_at) {
      await db.query(
        'UPDATE tickets SET first_response_at = NOW() WHERE id = $1',
        [req.params.id]
      );
    }

    const comment = await db.queryOne(
      `INSERT INTO ticket_comments (ticket_id, user_id, text, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, userId, text, is_internal || false]
    );

    // Get author info
    const fullComment = await db.queryOne(
      `SELECT tc.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as author
       FROM ticket_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.id = $1`,
      [comment.id]
    );

    res.json({ success: true, comment: fullComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/tickets/:id - Delete ticket
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM tickets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
