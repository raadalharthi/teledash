const express = require('express');
const router = express.Router();
const db = require('../db');
const telegram = require('../telegram');
const email = require('../email');
const { storeOutgoingMessage } = require('../utils/processMessage');
const { emitNewMessage, emitConversationUpdated } = require('../socket');

/**
 * POST /api/messages/send
 * Send a message to a conversation
 */
router.post('/send', async (req, res) => {
  try {
    const { conversation_id, text, media_type, media_url } = req.body;

    // Validate required fields
    if (!conversation_id) {
      return res.status(400).json({
        success: false,
        error: 'conversation_id is required'
      });
    }

    if (!text && !media_url) {
      return res.status(400).json({
        success: false,
        error: 'Either text or media_url is required'
      });
    }

    // Get conversation details
    const convResult = await db.queryOne(`
      SELECT channel_type, channel_chat_id
      FROM conversations
      WHERE id = $1
    `, [conversation_id]);

    if (!convResult) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    let result;

    // Send via appropriate channel
    if (convResult.channel_type === 'telegram') {
      if (media_type === 'photo' && media_url) {
        result = await telegram.sendPhoto(convResult.channel_chat_id, media_url, {
          caption: text || ''
        });
      } else if (media_type === 'document' && media_url) {
        result = await telegram.sendDocument(convResult.channel_chat_id, media_url, {
          caption: text || ''
        });
      } else {
        result = await telegram.sendMessage(convResult.channel_chat_id, text);
      }

      if (result.success) {
        // Store message in database
        await storeOutgoingMessage(
          conversation_id,
          text || `(${media_type})`,
          result.message.message_id
        );

        return res.json({
          success: true,
          message: 'Message sent successfully',
          telegram_message_id: result.message.message_id
        });
      } else {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } else if (convResult.channel_type === 'email') {
      // Try to extract subject from last incoming message text (format: [Subject] body)
      const lastMessage = await db.queryOne(`
        SELECT text FROM messages
        WHERE conversation_id = $1 AND sender_type = 'user'
        ORDER BY created_at DESC LIMIT 1
      `, [conversation_id]);

      let subject = 'Message from TeleDash';
      if (lastMessage?.text) {
        const subjectMatch = lastMessage.text.match(/^\[(.+?)\]/);
        if (subjectMatch) {
          const origSubject = subjectMatch[1];
          subject = origSubject.startsWith('Re:') ? origSubject : `Re: ${origSubject}`;
        }
      }

      // Send email
      result = await email.sendEmail(
        convResult.channel_chat_id,
        subject,
        text
      );

      if (result.success) {
        // Store message
        const msgResult = await db.queryOne(`
          INSERT INTO messages (conversation_id, sender_type, text, status)
          VALUES ($1, 'admin', $2, 'sent')
          RETURNING *
        `, [conversation_id, text]);

        // Update conversation
        await db.query(`
          UPDATE conversations
          SET last_message_text = $1, last_message_time = NOW(), updated_at = NOW()
          WHERE id = $2
        `, [text.substring(0, 200), conversation_id]);

        // Emit real-time updates
        if (msgResult) {
          emitNewMessage(conversation_id, msgResult);

          const fullConv = await db.queryOne(`
            SELECT c.*, json_build_object('id', co.id, 'name', co.name, 'email', co.email) as contact
            FROM conversations c LEFT JOIN contacts co ON c.contact_id = co.id WHERE c.id = $1
          `, [conversation_id]);
          if (fullConv) emitConversationUpdated(fullConv);
        }

        return res.json({
          success: true,
          message: 'Email sent successfully',
          email_message_id: result.messageId
        });
      } else {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: `Channel type ${convResult.channel_type} not yet supported`
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/messages/:conversation_id
 * Get messages for a conversation
 */
router.get('/:conversation_id', async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.query(`
      SELECT *
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT $2 OFFSET $3
    `, [conversation_id, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      messages: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/messages/mark-read/:conversation_id
 * Mark all messages in a conversation as read
 */
router.patch('/mark-read/:conversation_id', async (req, res) => {
  try {
    const { conversation_id } = req.params;

    // Reset unread count
    const result = await db.queryOne(`
      UPDATE conversations
      SET unread_count = 0
      WHERE id = $1
      RETURNING *
    `, [conversation_id]);

    // Emit real-time update
    if (result) {
      emitConversationUpdated(result);
    }

    res.json({
      success: true,
      message: 'Conversation marked as read'
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
