const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Extract email address from "Name <email@domain.com>" format
 */
function extractEmail(emailString) {
  if (!emailString) return '';
  const match = emailString.match(/<(.+)>/);
  return match ? match[1] : emailString.trim();
}

/**
 * Extract name from "Name <email@domain.com>" format
 */
function extractName(emailString) {
  if (!emailString) return '';
  const match = emailString.match(/^(.+)\s*</);
  return match ? match[1].trim().replace(/"/g, '') : '';
}

/**
 * Find or create contact by email
 */
async function findOrCreateContactByEmail(email, name) {
  const existing = await db.queryOne(
    `SELECT * FROM contacts WHERE email = $1`, [email]
  );

  if (existing) return existing;

  const newContact = await db.queryOne(
    `INSERT INTO contacts (email, name, tags) VALUES ($1, $2, $3) RETURNING *`,
    [email, name || email, '[]']
  );

  console.log('Created new email contact:', name || email);
  return newContact;
}

/**
 * Find or create conversation for email
 */
async function findOrCreateEmailConversation(email, contactId) {
  const existing = await db.queryOne(
    `SELECT * FROM conversations WHERE channel_type = 'email' AND channel_chat_id = $1`,
    [email]
  );

  if (existing) return existing;

  const newConv = await db.queryOne(
    `INSERT INTO conversations (channel_type, channel_chat_id, contact_id, unread_count)
     VALUES ('email', $1, $2, 0) RETURNING *`,
    [email, contactId]
  );

  console.log('Created new email conversation:', newConv.id);
  return newConv;
}

/**
 * POST /api/email/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('Received email webhook');

    const {
      from, to, subject, text, html, messageId,
      sender_ip, spam_score,
      'message-id': mailgunMessageId,
      'body-plain': mailgunText,
      'body-html': mailgunHtml,
      'stripped-text': strippedText
    } = req.body;

    const emailFrom = from;
    const emailSubject = subject || '(No subject)';
    const emailText = text || mailgunText || strippedText || '';
    const emailMessageId = messageId || mailgunMessageId;

    if (!emailFrom) {
      return res.status(400).json({ success: false, error: 'From address required' });
    }

    const fromEmail = extractEmail(emailFrom);
    const fromName = extractName(emailFrom) || fromEmail;

    const contact = await findOrCreateContactByEmail(fromEmail, fromName);
    const conversation = await findOrCreateEmailConversation(fromEmail, contact.id);

    const message = await db.queryOne(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, text, email_subject, email_from, email_to, status)
       VALUES ($1, 'user', $2, $3, $4, $5, $6, 'sent') RETURNING *`,
      [conversation.id, fromEmail, emailText, emailSubject, emailFrom, to]
    );

    await db.query(
      `UPDATE conversations SET last_message_text = $1, last_message_time = NOW(), unread_count = unread_count + 1
       WHERE id = $2`,
      [(emailSubject || emailText.substring(0, 100)), conversation.id]
    );

    res.json({ success: true, messageId: message.id });
  } catch (error) {
    console.error('Error processing email webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email/webhook
 */
router.get('/webhook', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Email webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
