const db = require('../db');
const { emitNewMessage, emitConversationUpdated, emitNewConversation } = require('../socket');

/**
 * Find or create a contact based on Telegram user info
 * @param {object} from - Telegram user object
 * @returns {object} Contact record
 */
async function findOrCreateContact(from, userId) {
  const telegramId = from.id.toString();

  // Try to find existing contact
  const existingContact = await db.queryOne(
    'SELECT * FROM contacts WHERE telegram_id = $1 AND user_id = $2',
    [telegramId, userId]
  );

  if (existingContact) {
    return existingContact;
  }

  // Create new contact
  const contactName = [from.first_name, from.last_name]
    .filter(Boolean)
    .join(' ') || from.username || `User ${telegramId}`;

  const newContact = await db.queryOne(
    `INSERT INTO contacts (telegram_id, name, tags, user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [telegramId, contactName, '{}', userId]
  );

  if (!newContact) {
    throw new Error('Failed to create contact');
  }

  console.log('Created new contact:', contactName);
  return newContact;
}

/**
 * Find or create a conversation
 * @param {string} channelType - Type of channel (e.g., 'telegram')
 * @param {string} channelChatId - The chat ID from the channel
 * @param {string} contactId - UUID of the contact
 * @returns {object} Conversation record with isNew flag
 */
async function findOrCreateConversation(channelType, channelChatId, contactId, userId) {
  // Try to find existing conversation
  const existingConv = await db.queryOne(
    `SELECT * FROM conversations
     WHERE channel_type = $1 AND channel_chat_id = $2 AND user_id = $3`,
    [channelType, channelChatId.toString(), userId]
  );

  if (existingConv) {
    return { conversation: existingConv, isNew: false };
  }

  // Create new conversation
  const newConv = await db.queryOne(
    `INSERT INTO conversations (channel_type, channel_chat_id, contact_id, unread_count, user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [channelType, channelChatId.toString(), contactId, 0, userId]
  );

  if (!newConv) {
    throw new Error('Failed to create conversation');
  }

  console.log('Created new conversation:', newConv.id);
  return { conversation: newConv, isNew: true };
}

/**
 * Process incoming message from Telegram
 * @param {object} message - Telegram message object
 */
async function processIncomingMessage(message) {
  try {
    console.log('Processing incoming message from:', message.from.username || message.from.id);

    // 0. Resolve user_id from the telegram channel
    const channel = await db.queryOne(
      `SELECT user_id FROM channels WHERE channel_type = 'telegram' AND is_active = true LIMIT 1`
    );
    const userId = channel?.user_id || null;

    // 1. Find or create contact
    const contact = await findOrCreateContact(message.from, userId);

    // 2. Find or create conversation
    const { conversation, isNew } = await findOrCreateConversation(
      'telegram',
      message.chat.id,
      contact.id,
      userId
    );

    // 3. Determine message type and content
    let messageText = message.text || message.caption || '';
    let mediaType = null;
    let mediaUrl = null;

    if (message.photo) {
      mediaType = 'photo';
      // Get the largest photo size
      const largestPhoto = message.photo[message.photo.length - 1];
      mediaUrl = largestPhoto.file_id;
    } else if (message.video) {
      mediaType = 'video';
      mediaUrl = message.video.file_id;
    } else if (message.document) {
      mediaType = 'document';
      mediaUrl = message.document.file_id;
    } else if (message.voice) {
      mediaType = 'voice';
      mediaUrl = message.voice.file_id;
    } else if (message.audio) {
      mediaType = 'audio';
      mediaUrl = message.audio.file_id;
    } else if (message.sticker) {
      mediaType = 'sticker';
      mediaUrl = message.sticker.file_id;
      messageText = message.sticker.emoji || '(Sticker)';
    }

    // 4. Store message in database
    const newMessage = await db.queryOne(
      `INSERT INTO messages (
        conversation_id, sender_type, sender_id, text,
        media_type, media_url, telegram_message_id, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        conversation.id,
        'user',
        message.from.id.toString(),
        messageText,
        mediaType,
        mediaUrl,
        message.message_id,
        'sent',
        new Date(message.date * 1000).toISOString()
      ]
    );

    if (!newMessage) {
      throw new Error('Failed to store message');
    }

    // 5. Update conversation last message info and increment unread count
    const updatedConversation = await db.queryOne(
      `UPDATE conversations
       SET last_message_text = $1,
           last_message_time = $2,
           unread_count = unread_count + 1,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [
        messageText || `(${mediaType})`,
        new Date(message.date * 1000).toISOString(),
        conversation.id
      ]
    );

    console.log('Updated conversation unread count to:', updatedConversation?.unread_count);

    // 6. Emit real-time events
    emitNewMessage(conversation.id, newMessage);

    // Get full conversation with contact for the update event
    const fullConversation = await db.queryOne(
      `SELECT c.*,
        json_build_object(
          'id', co.id,
          'name', co.name,
          'telegram_id', co.telegram_id,
          'email', co.email,
          'phone', co.phone,
          'avatar_url', co.avatar_url
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

    console.log('Message processed successfully:', newMessage.id);
    return { success: true, message: newMessage };

  } catch (error) {
    console.error('Error processing message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store outgoing message in database
 * @param {string} conversationId - UUID of the conversation
 * @param {string} text - Message text
 * @param {number} telegramMessageId - Telegram message ID
 */
async function storeOutgoingMessage(conversationId, text, telegramMessageId) {
  try {
    const newMessage = await db.queryOne(
      `INSERT INTO messages (conversation_id, sender_type, text, telegram_message_id, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [conversationId, 'admin', text, telegramMessageId, 'sent']
    );

    if (!newMessage) {
      throw new Error('Failed to store outgoing message');
    }

    // Update conversation last message
    const updatedConversation = await db.queryOne(
      `UPDATE conversations
       SET last_message_text = $1,
           last_message_time = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [text, conversationId]
    );

    // Emit real-time events
    emitNewMessage(conversationId, newMessage);

    // Get full conversation with contact for the update event
    const fullConversation = await db.queryOne(
      `SELECT c.*,
        json_build_object(
          'id', co.id,
          'name', co.name,
          'telegram_id', co.telegram_id,
          'email', co.email,
          'phone', co.phone,
          'avatar_url', co.avatar_url
        ) as contact
       FROM conversations c
       LEFT JOIN contacts co ON c.contact_id = co.id
       WHERE c.id = $1`,
      [conversationId]
    );

    emitConversationUpdated(fullConversation);

    return { success: true, message: newMessage };
  } catch (error) {
    console.error('Error storing outgoing message:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  findOrCreateContact,
  findOrCreateConversation,
  processIncomingMessage,
  storeOutgoingMessage
};
