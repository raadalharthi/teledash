const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

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
  // Try to find existing contact
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('email', email)
    .single();

  if (existing) return existing;

  // Create new contact
  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert({
      email,
      name: name || email,
      tags: []
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating contact:', error);
    throw error;
  }

  console.log('✅ Created new email contact:', name || email);
  return newContact;
}

/**
 * Find or create conversation for email
 */
async function findOrCreateEmailConversation(email, contactId) {
  // Try to find existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('channel_type', 'email')
    .eq('channel_chat_id', email)
    .single();

  if (existing) return existing;

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      channel_type: 'email',
      channel_chat_id: email,
      contact_id: contactId,
      unread_count: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }

  console.log('✅ Created new email conversation:', newConv.id);
  return newConv;
}

/**
 * POST /api/email/webhook
 * Receives incoming emails from email provider (SendGrid, Mailgun, etc.)
 *
 * Expected payload format (adjust based on your email provider):
 * {
 *   from: "Name <email@domain.com>",
 *   to: "support@yourdomain.com",
 *   subject: "Email subject",
 *   text: "Plain text body",
 *   html: "<p>HTML body</p>",
 *   messageId: "unique-message-id"
 * }
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('📧 Received email webhook');

    const {
      from,
      to,
      subject,
      text,
      html,
      messageId,
      // SendGrid specific fields
      sender_ip,
      spam_score,
      // Mailgun specific fields
      'message-id': mailgunMessageId,
      'body-plain': mailgunText,
      'body-html': mailgunHtml,
      'stripped-text': strippedText
    } = req.body;

    // Handle different email provider formats
    const emailFrom = from;
    const emailSubject = subject || '(No subject)';
    const emailText = text || mailgunText || strippedText || '';
    const emailMessageId = messageId || mailgunMessageId;

    if (!emailFrom) {
      console.log('⚠️ No from address in webhook');
      return res.status(400).json({
        success: false,
        error: 'From address required'
      });
    }

    // Extract email and name
    const fromEmail = extractEmail(emailFrom);
    const fromName = extractName(emailFrom) || fromEmail;

    console.log(`📨 Processing email from: ${fromName} <${fromEmail}>`);

    // Find or create contact
    const contact = await findOrCreateContactByEmail(fromEmail, fromName);

    // Find or create conversation
    const conversation = await findOrCreateEmailConversation(fromEmail, contact.id);

    // Store message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'user',
        sender_id: fromEmail,
        text: emailText,
        email_subject: emailSubject,
        email_from: emailFrom,
        email_to: to,
        status: 'sent'
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error storing email message:', messageError);
      throw messageError;
    }

    // Update conversation
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message_text: emailSubject || emailText.substring(0, 100),
        last_message_time: new Date().toISOString(),
        unread_count: conversation.unread_count + 1
      })
      .eq('id', conversation.id);

    if (updateError) {
      console.error('Error updating conversation:', updateError);
    }

    console.log('✅ Email processed successfully:', message.id);

    res.json({
      success: true,
      messageId: message.id
    });
  } catch (error) {
    console.error('❌ Error processing email webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/email/webhook
 * Health check for email webhook
 */
router.get('/webhook', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Email webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
