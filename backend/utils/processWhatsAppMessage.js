/**
 * WhatsApp Message Processing
 * Handles incoming messages from Evolution API webhooks
 */

const db = require('../db');
const {
  emitNewMessage,
  emitMessageUpdated,
  emitConversationUpdated,
  emitNewConversation,
  emitMessageDeleted,
  emitWhatsAppConnection,
  emitWhatsAppQRCode
} = require('../socket');

/**
 * Find or create a WhatsApp contact
 */
async function findOrCreateWhatsAppContact(remoteJid, pushName, userId) {
  // Extract phone number from JID (e.g., "5511999999999@s.whatsapp.net" -> "5511999999999")
  const whatsappId = remoteJid.split('@')[0];

  const existingContact = await db.queryOne(
    'SELECT * FROM contacts WHERE whatsapp_id = $1 AND user_id = $2',
    [whatsappId, userId]
  );

  if (existingContact) {
    // Update name if changed and we have a new name
    if (pushName && pushName !== existingContact.name && !existingContact.name.startsWith('WhatsApp ')) {
      // Only update if current name is auto-generated
    } else if (pushName && existingContact.name.startsWith('WhatsApp ')) {
      await db.query(
        'UPDATE contacts SET name = $1, updated_at = NOW() WHERE id = $2',
        [pushName, existingContact.id]
      );
      existingContact.name = pushName;
    }
    return existingContact;
  }

  // Create new contact
  const contactName = pushName || `WhatsApp ${whatsappId}`;

  const newContact = await db.queryOne(
    `INSERT INTO contacts (whatsapp_id, name, phone, tags, user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [whatsappId, contactName, whatsappId, '{}', userId]
  );

  console.log('Created new WhatsApp contact:', contactName, whatsappId);
  return newContact;
}

/**
 * Find or create a WhatsApp conversation
 */
async function findOrCreateWhatsAppConversation(remoteJid, contactId, userId) {
  const existingConv = await db.queryOne(
    `SELECT * FROM conversations
     WHERE channel_type = 'whatsapp' AND channel_chat_id = $1 AND user_id = $2`,
    [remoteJid, userId]
  );

  if (existingConv) {
    return { conversation: existingConv, isNew: false };
  }

  const newConv = await db.queryOne(
    `INSERT INTO conversations (channel_type, channel_chat_id, contact_id, unread_count, user_id)
     VALUES ('whatsapp', $1, $2, 0, $3)
     RETURNING *`,
    [remoteJid, contactId, userId]
  );

  console.log('Created new WhatsApp conversation:', newConv.id);
  return { conversation: newConv, isNew: true };
}

/**
 * Process incoming WhatsApp message from Evolution API
 */
async function processWhatsAppMessage(data, instanceName) {
  try {
    const message = data.message || data;
    const key = message.key || data.key;

    if (!key) {
      console.log('WhatsApp message missing key, skipping');
      return { success: false, error: 'Missing message key' };
    }

    const remoteJid = key.remoteJid;
    const fromMe = key.fromMe;
    const messageId = key.id;
    const pushName = message.pushName || data.pushName;
    const timestamp = message.messageTimestamp || data.messageTimestamp || Math.floor(Date.now() / 1000);

    // Skip group messages for now (can be enabled later)
    if (remoteJid.includes('@g.us')) {
      console.log('Skipping group message:', remoteJid);
      return { success: true, skipped: true, reason: 'group_message' };
    }

    // Get the channel owner (user who configured WhatsApp)
    const channel = await db.queryOne(
      `SELECT user_id FROM channels
       WHERE channel_type = 'whatsapp' AND is_active = true
       AND (config->>'instance_name' = $1 OR $1 IS NULL)
       LIMIT 1`,
      [instanceName]
    );

    if (!channel) {
      console.log('No active WhatsApp channel found for instance:', instanceName);
      return { success: false, error: 'No active channel' };
    }

    const userId = channel.user_id;

    // Find or create contact and conversation
    const contact = await findOrCreateWhatsAppContact(remoteJid, pushName, userId);
    const { conversation, isNew } = await findOrCreateWhatsAppConversation(remoteJid, contact.id, userId);

    // Extract message content
    const msgContent = message.message || {};
    let messageText = '';
    let mediaType = null;
    let mediaUrl = null;
    let fileName = null;
    let fileSize = null;
    let mimeType = null;
    let duration = null;
    let width = null;
    let height = null;

    // Parse different message types
    if (msgContent.conversation) {
      messageText = msgContent.conversation;
    } else if (msgContent.extendedTextMessage) {
      messageText = msgContent.extendedTextMessage.text;
    } else if (msgContent.imageMessage) {
      mediaType = 'photo';
      messageText = msgContent.imageMessage.caption || '';
      mediaUrl = msgContent.imageMessage.url;
      mimeType = msgContent.imageMessage.mimetype;
      width = msgContent.imageMessage.width;
      height = msgContent.imageMessage.height;
      fileSize = parseInt(msgContent.imageMessage.fileLength) || null;
    } else if (msgContent.videoMessage) {
      mediaType = 'video';
      messageText = msgContent.videoMessage.caption || '';
      mediaUrl = msgContent.videoMessage.url;
      mimeType = msgContent.videoMessage.mimetype;
      duration = msgContent.videoMessage.seconds;
      width = msgContent.videoMessage.width;
      height = msgContent.videoMessage.height;
      fileSize = parseInt(msgContent.videoMessage.fileLength) || null;
    } else if (msgContent.audioMessage) {
      mediaType = msgContent.audioMessage.ptt ? 'voice' : 'audio';
      mediaUrl = msgContent.audioMessage.url;
      mimeType = msgContent.audioMessage.mimetype;
      duration = msgContent.audioMessage.seconds;
      fileSize = parseInt(msgContent.audioMessage.fileLength) || null;
    } else if (msgContent.documentMessage) {
      mediaType = 'document';
      messageText = msgContent.documentMessage.caption || '';
      fileName = msgContent.documentMessage.fileName;
      mediaUrl = msgContent.documentMessage.url;
      mimeType = msgContent.documentMessage.mimetype;
      fileSize = parseInt(msgContent.documentMessage.fileLength) || null;
    } else if (msgContent.stickerMessage) {
      mediaType = 'sticker';
      mediaUrl = msgContent.stickerMessage.url;
      mimeType = msgContent.stickerMessage.mimetype;
      width = msgContent.stickerMessage.width;
      height = msgContent.stickerMessage.height;
    } else if (msgContent.locationMessage) {
      const loc = msgContent.locationMessage;
      messageText = `📍 Location: ${loc.degreesLatitude}, ${loc.degreesLongitude}`;
      if (loc.name) messageText = `📍 ${loc.name}\n${loc.address || ''}`;
    } else if (msgContent.contactMessage) {
      messageText = `👤 Contact: ${msgContent.contactMessage.displayName}`;
    } else if (msgContent.contactsArrayMessage) {
      const names = msgContent.contactsArrayMessage.contacts?.map(c => c.displayName).join(', ');
      messageText = `👤 Contacts: ${names}`;
    }

    // Handle reply threading
    let replyToMessageId = null;
    const contextInfo = msgContent.extendedTextMessage?.contextInfo ||
                        msgContent.imageMessage?.contextInfo ||
                        msgContent.videoMessage?.contextInfo ||
                        msgContent.audioMessage?.contextInfo ||
                        msgContent.documentMessage?.contextInfo;

    if (contextInfo?.stanzaId) {
      const replyMsg = await db.queryOne(
        `SELECT id FROM messages WHERE conversation_id = $1 AND whatsapp_message_id = $2`,
        [conversation.id, contextInfo.stanzaId]
      );
      if (replyMsg) {
        replyToMessageId = replyMsg.id;
      }
    }

    // Determine sender type
    const senderType = fromMe ? 'admin' : 'user';

    // Check for duplicate message
    const existingMsg = await db.queryOne(
      'SELECT id FROM messages WHERE whatsapp_message_id = $1 AND conversation_id = $2',
      [messageId, conversation.id]
    );

    if (existingMsg) {
      console.log('Duplicate WhatsApp message, skipping:', messageId);
      return { success: true, skipped: true, reason: 'duplicate' };
    }

    // Store message
    const newMessage = await db.queryOne(
      `INSERT INTO messages (
        conversation_id, sender_type, sender_id, text,
        media_type, media_url, whatsapp_message_id, status, created_at,
        file_name, file_size, mime_type, duration, width, height,
        reply_to_message_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        conversation.id,
        senderType,
        remoteJid,
        messageText,
        mediaType,
        mediaUrl,
        messageId,
        'sent',
        new Date(timestamp * 1000).toISOString(),
        fileName,
        fileSize,
        mimeType,
        duration,
        width,
        height,
        replyToMessageId
      ]
    );

    // Re-fetch with reply data if needed
    let fullMessage = newMessage;
    if (replyToMessageId) {
      fullMessage = await db.queryOne(
        `SELECT m.*,
          CASE WHEN m.reply_to_message_id IS NOT NULL THEN
            json_build_object(
              'id', rm.id, 'text', rm.text, 'sender_type', rm.sender_type,
              'media_type', rm.media_type, 'created_at', rm.created_at
            )
          ELSE NULL END as reply_to_message
         FROM messages m
         LEFT JOIN messages rm ON m.reply_to_message_id = rm.id
         WHERE m.id = $1`,
        [newMessage.id]
      );
    }

    // Update conversation (increment unread only for incoming messages)
    const unreadIncrement = fromMe ? 0 : 1;
    await db.query(
      `UPDATE conversations
       SET last_message_text = $1,
           last_message_time = $2,
           unread_count = unread_count + $3,
           updated_at = NOW()
       WHERE id = $4`,
      [
        messageText || `[${mediaType || 'message'}]`,
        new Date(timestamp * 1000).toISOString(),
        unreadIncrement,
        conversation.id
      ]
    );

    // Emit socket events
    emitNewMessage(conversation.id, fullMessage);

    // Get full conversation with contact for list update
    const fullConversation = await db.queryOne(
      `SELECT c.*,
        json_build_object(
          'id', co.id, 'name', co.name, 'whatsapp_id', co.whatsapp_id,
          'email', co.email, 'phone', co.phone, 'avatar_url', co.avatar_url
        ) as contact
       FROM conversations c
       LEFT JOIN contacts co ON c.contact_id = co.id
       WHERE c.id = $1`,
      [conversation.id]
    );

    if (isNew) {
      emitNewConversation(fullConversation);
    } else {
      emitConversationUpdated(fullConversation);
    }

    console.log('WhatsApp message processed:', newMessage.id, senderType, messageText?.substring(0, 50));
    return { success: true, message: fullMessage };

  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process message status update (delivered, read)
 */
async function processWhatsAppStatus(data, instanceName) {
  try {
    // Evolution API sends status updates in different formats
    const updates = Array.isArray(data) ? data : [data];

    for (const update of updates) {
      const messageId = update.key?.id || update.id;
      const status = update.status;

      if (!messageId || !status) continue;

      // Map Evolution API status to our status
      const statusMap = {
        'DELIVERY_ACK': 'delivered',
        'READ': 'read',
        'PLAYED': 'read',
        'PENDING': 'sent',
        'SERVER_ACK': 'sent'
      };

      const newStatus = statusMap[status];
      if (!newStatus) continue;

      const msg = await db.queryOne(
        `UPDATE messages
         SET status = $1, updated_at = NOW()
         WHERE whatsapp_message_id = $2
         RETURNING *`,
        [newStatus, messageId]
      );

      if (msg) {
        emitMessageUpdated(msg.conversation_id, msg);
        console.log('WhatsApp message status updated:', messageId, newStatus);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing WhatsApp status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process message deletion
 */
async function processWhatsAppDelete(data, instanceName) {
  try {
    const messageId = data.key?.id || data.id;
    if (!messageId) return { success: false, error: 'Missing message ID' };

    const msg = await db.queryOne(
      `UPDATE messages
       SET is_deleted = true, updated_at = NOW()
       WHERE whatsapp_message_id = $1
       RETURNING *`,
      [messageId]
    );

    if (msg) {
      emitMessageDeleted(msg.conversation_id, msg.id);
      console.log('WhatsApp message deleted:', messageId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing WhatsApp delete:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process connection status update
 */
async function processWhatsAppConnection(data, instanceName) {
  try {
    const state = data.state || data.status;
    console.log('WhatsApp connection update:', instanceName, state);

    // Update channel config with connection status
    const connected = state === 'open';

    await db.query(
      `UPDATE channels
       SET config = config || $1::jsonb, updated_at = NOW()
       WHERE channel_type = 'whatsapp'
       AND (config->>'instance_name' = $2 OR $2 IS NULL)`,
      [JSON.stringify({ connected }), instanceName]
    );

    // Emit to all connected clients
    emitWhatsAppConnection({ state, instance: instanceName, connected });

    return { success: true };
  } catch (error) {
    console.error('Error processing WhatsApp connection:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process QR code update
 */
async function processWhatsAppQRCode(data, instanceName) {
  try {
    const qrcode = data.qrcode || data.base64;
    console.log('WhatsApp QR code updated for instance:', instanceName);

    // Emit QR code to frontend
    emitWhatsAppQRCode({ qrcode, instance: instanceName });

    return { success: true };
  } catch (error) {
    console.error('Error processing WhatsApp QR code:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store outgoing WhatsApp message in database
 * Called after sending a message via the API
 */
async function storeOutgoingWhatsAppMessage(conversationId, text, whatsappMessageId, extra = {}) {
  try {
    const {
      mediaType = null,
      mediaUrl = null,
      fileName = null,
      fileSize = null,
      mimeType = null,
      duration = null,
      width = null,
      height = null,
      replyToMessageId = null
    } = extra;

    const newMessage = await db.queryOne(
      `INSERT INTO messages (
        conversation_id, sender_type, text, whatsapp_message_id, status,
        media_type, media_url, file_name, file_size, mime_type, duration, width, height,
        reply_to_message_id
      )
      VALUES ($1, 'admin', $2, $3, 'sent', $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        conversationId, text, whatsappMessageId,
        mediaType, mediaUrl, fileName, fileSize, mimeType, duration, width, height,
        replyToMessageId
      ]
    );

    // Re-fetch with reply data
    let fullMessage = newMessage;
    if (replyToMessageId) {
      fullMessage = await db.queryOne(
        `SELECT m.*,
          CASE WHEN m.reply_to_message_id IS NOT NULL THEN
            json_build_object(
              'id', rm.id, 'text', rm.text, 'sender_type', rm.sender_type,
              'media_type', rm.media_type, 'created_at', rm.created_at
            )
          ELSE NULL END as reply_to_message
         FROM messages m
         LEFT JOIN messages rm ON m.reply_to_message_id = rm.id
         WHERE m.id = $1`,
        [newMessage.id]
      );
    }

    // Update conversation
    await db.query(
      `UPDATE conversations
       SET last_message_text = $1, last_message_time = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [text || `[${mediaType || 'message'}]`, conversationId]
    );

    // Emit events
    emitNewMessage(conversationId, fullMessage);

    const fullConversation = await db.queryOne(
      `SELECT c.*,
        json_build_object(
          'id', co.id, 'name', co.name, 'whatsapp_id', co.whatsapp_id,
          'email', co.email, 'phone', co.phone, 'avatar_url', co.avatar_url
        ) as contact
       FROM conversations c
       LEFT JOIN contacts co ON c.contact_id = co.id
       WHERE c.id = $1`,
      [conversationId]
    );

    emitConversationUpdated(fullConversation);

    return { success: true, message: fullMessage };
  } catch (error) {
    console.error('Error storing outgoing WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  findOrCreateWhatsAppContact,
  findOrCreateWhatsAppConversation,
  processWhatsAppMessage,
  processWhatsAppStatus,
  processWhatsAppDelete,
  processWhatsAppConnection,
  processWhatsAppQRCode,
  storeOutgoingWhatsAppMessage
};
