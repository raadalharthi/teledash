const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const telegram = require('../telegram');
const email = require('../email');
const { storeOutgoingMessage } = require('../utils/processMessage');
const { emitNewMessage, emitMessageUpdated, emitConversationUpdated, emitMessageDeleted, emitTypingIndicator } = require('../socket');

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

/**
 * POST /api/messages/upload
 * Upload a file and send it to a conversation
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { conversation_id, caption, reply_to_message_id } = req.body;
    const file = req.file;

    if (!file || !conversation_id) {
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, error: 'file and conversation_id required' });
    }

    const conv = await db.queryOne(
      'SELECT channel_type, channel_chat_id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversation_id, req.user.id]
    );
    if (!conv) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Determine media type from MIME
    let mediaType = 'document';
    if (file.mimetype.startsWith('image/')) mediaType = 'photo';
    else if (file.mimetype.startsWith('video/')) mediaType = 'video';
    else if (file.mimetype.startsWith('audio/') || file.mimetype === 'audio/ogg') mediaType = 'audio';

    // Resolve reply
    let replyToTelegramId = null;
    if (reply_to_message_id) {
      const replyMsg = await db.queryOne('SELECT telegram_message_id FROM messages WHERE id = $1', [reply_to_message_id]);
      if (replyMsg) replyToTelegramId = replyMsg.telegram_message_id;
    }

    const sendOptions = {};
    if (caption) sendOptions.caption = caption;
    if (replyToTelegramId) {
      sendOptions.reply_to_message_id = replyToTelegramId;
      sendOptions.reply_parameters = { message_id: replyToTelegramId };
    }

    let result;
    const filePath = file.path;

    if (conv.channel_type === 'telegram') {
      const fileStream = fs.createReadStream(filePath);
      if (mediaType === 'photo') {
        result = await telegram.sendPhoto(conv.channel_chat_id, fileStream, sendOptions);
      } else if (mediaType === 'video') {
        result = await telegram.sendVideo(conv.channel_chat_id, fileStream, sendOptions);
      } else if (mediaType === 'audio') {
        result = await telegram.sendAudio(conv.channel_chat_id, fileStream, sendOptions);
      } else {
        // For documents, node-telegram-bot-api needs fileOptions
        const bot = await telegram.getBot();
        const msg = await bot.sendDocument(conv.channel_chat_id, fileStream, sendOptions, { filename: file.originalname });
        result = { success: true, message: msg };
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      if (result && result.success) {
        // Get file_id from the sent message
        let fileId = null;
        const sentMsg = result.message;
        if (sentMsg.photo) fileId = sentMsg.photo[sentMsg.photo.length - 1].file_id;
        else if (sentMsg.video) fileId = sentMsg.video.file_id;
        else if (sentMsg.audio) fileId = sentMsg.audio.file_id;
        else if (sentMsg.document) fileId = sentMsg.document.file_id;

        await storeOutgoingMessage(
          conversation_id,
          caption || `(${mediaType})`,
          sentMsg.message_id,
          { mediaType, mediaUrl: fileId, fileName: file.originalname, fileSize: file.size, mimeType: file.mimetype, replyToMessageId: reply_to_message_id }
        );

        return res.json({ success: true, message: 'File sent', telegram_message_id: sentMsg.message_id });
      } else {
        return res.status(500).json({ success: false, error: result?.error || 'Failed to send' });
      }
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, error: 'File upload only supported for Telegram' });
    }
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messages/send
 * Send a message (text or media) to a conversation
 */
router.post('/send', async (req, res) => {
  try {
    const { conversation_id, text, media_type, media_url, reply_to_message_id } = req.body;

    if (!conversation_id) {
      return res.status(400).json({ success: false, error: 'conversation_id is required' });
    }
    if (!text && !media_url) {
      return res.status(400).json({ success: false, error: 'Either text or media_url is required' });
    }

    const convResult = await db.queryOne(`
      SELECT channel_type, channel_chat_id
      FROM conversations WHERE id = $1 AND user_id = $2
    `, [conversation_id, req.user.id]);

    if (!convResult) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Resolve reply_to telegram message id
    let replyToTelegramId = null;
    if (reply_to_message_id) {
      const replyMsg = await db.queryOne(
        'SELECT telegram_message_id FROM messages WHERE id = $1',
        [reply_to_message_id]
      );
      if (replyMsg) replyToTelegramId = replyMsg.telegram_message_id;
    }

    let result;
    const sendOptions = {};
    if (replyToTelegramId) {
      // Support both old and new Telegram Bot API format
      sendOptions.reply_to_message_id = replyToTelegramId;
      sendOptions.reply_parameters = { message_id: replyToTelegramId };
    }

    if (convResult.channel_type === 'telegram') {
      if (media_type === 'photo' && media_url) {
        result = await telegram.sendPhoto(convResult.channel_chat_id, media_url, { caption: text || '', ...sendOptions });
      } else if (media_type === 'document' && media_url) {
        result = await telegram.sendDocument(convResult.channel_chat_id, media_url, { caption: text || '', ...sendOptions });
      } else if (media_type === 'video' && media_url) {
        result = await telegram.sendVideo(convResult.channel_chat_id, media_url, { caption: text || '', ...sendOptions });
      } else if (media_type === 'voice' && media_url) {
        result = await telegram.sendVoice(convResult.channel_chat_id, media_url, sendOptions);
      } else if (media_type === 'audio' && media_url) {
        result = await telegram.sendAudio(convResult.channel_chat_id, media_url, { caption: text || '', ...sendOptions });
      } else {
        result = await telegram.sendMessage(convResult.channel_chat_id, text, sendOptions);
      }

      if (result.success) {
        await storeOutgoingMessage(
          conversation_id,
          text || `(${media_type})`,
          result.message.message_id,
          { mediaType: media_type, mediaUrl: media_url, replyToMessageId: reply_to_message_id }
        );

        return res.json({
          success: true,
          message: 'Message sent successfully',
          telegram_message_id: result.message.message_id
        });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }
    } else if (convResult.channel_type === 'email') {
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

      result = await email.sendEmail(convResult.channel_chat_id, subject, text);

      if (result.success) {
        const msgResult = await db.queryOne(`
          INSERT INTO messages (conversation_id, sender_type, text, status)
          VALUES ($1, 'admin', $2, 'sent') RETURNING *
        `, [conversation_id, text]);

        await db.query(`
          UPDATE conversations SET last_message_text = $1, last_message_time = NOW(), updated_at = NOW()
          WHERE id = $2
        `, [text.substring(0, 200), conversation_id]);

        if (msgResult) {
          emitNewMessage(conversation_id, msgResult);
          const fullConv = await db.queryOne(`
            SELECT c.*, json_build_object('id', co.id, 'name', co.name, 'email', co.email) as contact
            FROM conversations c LEFT JOIN contacts co ON c.contact_id = co.id WHERE c.id = $1
          `, [conversation_id]);
          if (fullConv) emitConversationUpdated(fullConv);
        }

        return res.json({ success: true, message: 'Email sent successfully' });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }
    } else {
      return res.status(400).json({ success: false, error: `Channel type ${convResult.channel_type} not yet supported` });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/messages/:id/edit
 * Edit a sent message
 */
router.put('/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) return res.status(400).json({ success: false, error: 'text is required' });

    // Find message and verify ownership
    const msg = await db.queryOne(`
      SELECT m.*, c.channel_type, c.channel_chat_id, c.user_id
      FROM messages m JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = $1 AND c.user_id = $2 AND m.sender_type = 'admin'
    `, [id, req.user.id]);

    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    // Edit on Telegram
    if (msg.channel_type === 'telegram' && msg.telegram_message_id) {
      const result = await telegram.editMessageText(msg.channel_chat_id, msg.telegram_message_id, text);
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error });
      }
    }

    // Update in DB
    const updated = await db.queryOne(`
      UPDATE messages SET text = $1, is_edited = true, edited_at = NOW(), updated_at = NOW()
      WHERE id = $2 RETURNING *
    `, [text, id]);

    emitMessageUpdated(msg.conversation_id, updated);
    res.json({ success: true, message: updated });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/messages/:id
 * Delete a message
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const msg = await db.queryOne(`
      SELECT m.*, c.channel_type, c.channel_chat_id, c.user_id
      FROM messages m JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = $1 AND c.user_id = $2 AND m.sender_type = 'admin'
    `, [id, req.user.id]);

    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    // Delete on Telegram
    if (msg.channel_type === 'telegram' && msg.telegram_message_id) {
      await telegram.deleteMessage(msg.channel_chat_id, msg.telegram_message_id);
    }

    // Soft delete in DB
    await db.query(`
      UPDATE messages SET is_deleted = true, text = '', media_url = NULL, updated_at = NOW()
      WHERE id = $1
    `, [id]);

    emitMessageDeleted(msg.conversation_id, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messages/typing
 * Send typing indicator
 */
router.post('/typing', async (req, res) => {
  try {
    const { conversation_id } = req.body;

    const conv = await db.queryOne(`
      SELECT channel_type, channel_chat_id FROM conversations WHERE id = $1 AND user_id = $2
    `, [conversation_id, req.user.id]);

    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });

    if (conv.channel_type === 'telegram') {
      await telegram.sendChatAction(conv.channel_chat_id, 'typing');
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messages/:id/react
 * React to a message
 */
router.post('/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    const msg = await db.queryOne(`
      SELECT m.*, c.channel_type, c.channel_chat_id, c.user_id
      FROM messages m JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = $1 AND c.user_id = $2
    `, [id, req.user.id]);

    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    // Send reaction to Telegram
    if (msg.channel_type === 'telegram' && msg.telegram_message_id) {
      await telegram.setMessageReaction(msg.channel_chat_id, msg.telegram_message_id, emoji);
    }

    // Update reactions in DB
    const currentReactions = msg.reactions || [];
    let newReactions;
    if (emoji) {
      // Add or update admin reaction
      newReactions = currentReactions.filter(r => r.user_id !== 'admin');
      newReactions.push({ type: 'emoji', emoji, user_id: 'admin' });
    } else {
      // Remove admin reaction
      newReactions = currentReactions.filter(r => r.user_id !== 'admin');
    }

    const updated = await db.queryOne(`
      UPDATE messages SET reactions = $1::jsonb, updated_at = NOW()
      WHERE id = $2 RETURNING *
    `, [JSON.stringify(newReactions), id]);

    emitMessageUpdated(msg.conversation_id, updated);
    res.json({ success: true, message: updated });
  } catch (error) {
    console.error('Error reacting to message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messages/file/:fileId
 * Proxy Telegram file downloads
 */
router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await telegram.getFileLink(fileId);
    if (!result.success) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    res.json({ success: true, url: result.fileLink });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messages/contact/:contactId/profile
 * Get contact profile info including Telegram profile photo
 */
router.get('/contact/:contactId/profile', async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await db.queryOne(
      'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, req.user.id]
    );
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

    let profilePhoto = contact.avatar_url;
    let chatInfo = null;

    if (contact.telegram_id) {
      // Get profile photo from Telegram
      const photoResult = await telegram.getUserProfilePhotos(contact.telegram_id);
      if (photoResult.success && photoResult.photoUrl) {
        profilePhoto = photoResult.photoUrl;
        // Cache the avatar URL
        await db.query('UPDATE contacts SET avatar_url = $1 WHERE id = $2', [profilePhoto, contactId]);
      }

      // Get chat info
      const chatResult = await telegram.getChat(contact.telegram_id);
      if (chatResult.success) {
        chatInfo = {
          bio: chatResult.chat.bio,
          username: chatResult.chat.username,
          first_name: chatResult.chat.first_name,
          last_name: chatResult.chat.last_name
        };
        // Update contact bio
        if (chatResult.chat.bio) {
          await db.query('UPDATE contacts SET bio = $1 WHERE id = $2', [chatResult.chat.bio, contactId]);
        }
      }
    }

    res.json({
      success: true,
      contact: { ...contact, avatar_url: profilePhoto },
      chat_info: chatInfo
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

    const conv = await db.queryOne(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversation_id, req.user.id]
    );
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const result = await db.query(`
      SELECT m.*,
        CASE WHEN m.reply_to_message_id IS NOT NULL THEN (
          SELECT json_build_object('id', rm.id, 'text', rm.text, 'sender_type', rm.sender_type, 'media_type', rm.media_type)
          FROM messages rm WHERE rm.id = m.reply_to_message_id
        ) END as reply_to_message
      FROM messages m
      WHERE m.conversation_id = $1 AND (m.is_deleted IS NULL OR m.is_deleted = false)
      ORDER BY m.created_at ASC
      LIMIT $2 OFFSET $3
    `, [conversation_id, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      messages: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/messages/mark-read/:conversation_id
 */
router.patch('/mark-read/:conversation_id', async (req, res) => {
  try {
    const { conversation_id } = req.params;

    const result = await db.queryOne(`
      UPDATE conversations SET unread_count = 0
      WHERE id = $1 AND user_id = $2 RETURNING *
    `, [conversation_id, req.user.id]);

    if (result) emitConversationUpdated(result);

    res.json({ success: true, message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
