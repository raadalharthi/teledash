const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/conversations
 * Get all conversations with contact info
 */
router.get('/', async (req, res) => {
  try {
    const { archived = false, limit = 50 } = req.query;
    const isArchived = archived === 'true';

    const result = await db.query(`
      SELECT
        c.*,
        json_build_object(
          'id', co.id,
          'name', co.name,
          'telegram_id', co.telegram_id,
          'whatsapp_id', co.whatsapp_id,
          'email', co.email,
          'phone', co.phone,
          'avatar_url', co.avatar_url,
          'tags', co.tags,
          'notes', co.notes,
          'created_at', co.created_at,
          'updated_at', co.updated_at
        ) as contact
      FROM conversations c
      LEFT JOIN contacts co ON c.contact_id = co.id
      WHERE c.is_archived = $1 AND c.user_id = $2
      ORDER BY
        c.last_message_time DESC NULLS LAST,
        c.created_at DESC
      LIMIT $3
    `, [isArchived, req.user.id, parseInt(limit)]);

    res.json({
      success: true,
      conversations: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/conversations/:id
 * Get a specific conversation
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        c.*,
        json_build_object(
          'id', co.id,
          'name', co.name,
          'telegram_id', co.telegram_id,
          'whatsapp_id', co.whatsapp_id,
          'email', co.email,
          'phone', co.phone,
          'avatar_url', co.avatar_url,
          'tags', co.tags,
          'notes', co.notes,
          'created_at', co.created_at,
          'updated_at', co.updated_at
        ) as contact
      FROM conversations c
      LEFT JOIN contacts co ON c.contact_id = co.id
      WHERE c.id = $1 AND c.user_id = $2
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      conversation: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/conversations/:id/archive
 * Archive or unarchive a conversation
 */
router.patch('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { archived = true } = req.body;

    const result = await db.query(`
      UPDATE conversations
      SET is_archived = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [archived, id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      conversation: result.rows[0],
      message: archived ? 'Conversation archived' : 'Conversation unarchived'
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/conversations/search/:query
 * Search conversations
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchPattern = `%${query}%`;

    const result = await db.query(`
      SELECT
        c.*,
        json_build_object(
          'id', co.id,
          'name', co.name,
          'telegram_id', co.telegram_id,
          'whatsapp_id', co.whatsapp_id,
          'email', co.email,
          'phone', co.phone,
          'avatar_url', co.avatar_url,
          'tags', co.tags,
          'notes', co.notes,
          'created_at', co.created_at,
          'updated_at', co.updated_at
        ) as contact
      FROM conversations c
      LEFT JOIN contacts co ON c.contact_id = co.id
      WHERE c.user_id = $2 AND (c.last_message_text ILIKE $1
         OR co.name ILIKE $1
         OR co.email ILIKE $1)
      ORDER BY c.last_message_time DESC NULLS LAST
    `, [searchPattern, req.user.id]);

    res.json({
      success: true,
      conversations: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error searching conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
