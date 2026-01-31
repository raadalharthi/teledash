const db = require('../db');
const { emitNewMessage, emitMessageUpdated, emitConversationUpdated, emitNewConversation, emitMessageDeleted, emitTypingIndicator } = require('../socket');

/**
 * Find or create a contact based on Telegram user info
 */
async function findOrCreateContact(from, userId) {
  const telegramId = from.id.toString();

  const existingContact = await db.queryOne(
    'SELECT * FROM contacts WHERE telegram_id = $1 AND user_id = $2',
    [telegramId, userId]
  );

  if (existingContact) {
    // Update username if changed
    if (from.username && from.username !== existingContact.username) {
      await db.query(
        'UPDATE contacts SET username = $1 WHERE id = $2',
        [from.username, existingContact.id]
      );
    }
    return existingContact;
  }

  const contactName = [from.first_name, from.last_name]
    .filter(Boolean)
    .join(' ') || from.username || `User ${telegramId}`;

  const newContact = await db.queryOne(
    `INSERT INTO contacts (telegram_id, name, username, tags, user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [telegramId, contactName, from.username || null, '{}', userId]
  );

  if (!newContact) {
    throw new Error('Failed to create contact');
  }

  console.log('Created new contact:', contactName);
  return newContact;
}

/**
 * Find or create a conversation
 */
async function findOrCreateConversation(channelType, channelChatId, contactId, userId) {
  const existingConv = await db.queryOne(
    `SELECT * FROM conversations
     WHERE channel_type = $1 AND channel_chat_id = $2 AND user_id = $3`,
    [channelType, channelChatId.toString(), userId]
  );

  if (existingConv) {
    return { conversation: existingConv, isNew: false };
  }

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
 */
async function processIncomingMessage(message) {
  try {
    console.log('Processing incoming message from:', message.from?.username || message.from?.id);

    const channel = await db.queryOne(
      `SELECT user_id FROM channels WHERE channel_type = 'telegram' AND is_active = true LIMIT 1`
    );
    const userId = channel?.user_id || null;

    const contact = await findOrCreateContact(message.from, userId);

    const { conversation, isNew } = await findOrCreateConversation(
      'telegram',
      message.chat.id,
      contact.id,
      userId
    );

    // Determine message type and content
    let messageText = message.text || message.caption || '';
    let mediaType = null;
    let mediaUrl = null;
    let fileName = null;
    let fileSize = null;
    let mimeType = null;
    let duration = null;
    let width = null;
    let height = null;

    if (message.photo) {
      mediaType = 'photo';
      const largestPhoto = message.photo[message.photo.length - 1];
      mediaUrl = largestPhoto.file_id;
      width = largestPhoto.width;
      height = largestPhoto.height;
      fileSize = largestPhoto.file_size;
    } else if (message.video) {
      mediaType = 'video';
      mediaUrl = message.video.file_id;
      fileName = message.video.file_name;
      fileSize = message.video.file_size;
      mimeType = message.video.mime_type;
      duration = message.video.duration;
      width = message.video.width;
      height = message.video.height;
    } else if (message.document) {
      mediaType = 'document';
      mediaUrl = message.document.file_id;
      fileName = message.document.file_name;
      fileSize = message.document.file_size;
      mimeType = message.document.mime_type;
    } else if (message.voice) {
      mediaType = 'voice';
      mediaUrl = message.voice.file_id;
      fileSize = message.voice.file_size;
      mimeType = message.voice.mime_type;
      duration = message.voice.duration;
    } else if (message.audio) {
      mediaType = 'audio';
      mediaUrl = message.audio.file_id;
      fileName = message.audio.file_name || message.audio.title;
      fileSize = message.audio.file_size;
      mimeType = message.audio.mime_type;
      duration = message.audio.duration;
    } else if (message.sticker) {
      mediaType = 'sticker';
      mediaUrl = message.sticker.file_id;
      messageText = message.sticker.emoji || '(Sticker)';
      width = message.sticker.width;
      height = message.sticker.height;
    } else if (message.video_note) {
      mediaType = 'video_note';
      mediaUrl = message.video_note.file_id;
      fileSize = message.video_note.file_size;
      duration = message.video_note.duration;
    }

    // Handle reply threading
    let replyToMessageId = null;
    let replyToTelegramId = null;
    if (message.reply_to_message) {
      replyToTelegramId = message.reply_to_message.message_id;
      const replyMsg = await db.queryOne(
        `SELECT id FROM messages WHERE conversation_id = $1 AND telegram_message_id = $2`,
        [conversation.id, replyToTelegramId]
      );
      if (replyMsg) {
        replyToMessageId = replyMsg.id;
      }
    }

    // Handle inline keyboard
    let replyMarkup = null;
    if (message.reply_markup) {
      replyMarkup = message.reply_markup;
    }

    // Store message
    const newMessage = await db.queryOne(
      `INSERT INTO messages (
        conversation_id, sender_type, sender_id, text,
        media_type, media_url, telegram_message_id, status, created_at,
        file_name, file_size, mime_type, duration, width, height,
        reply_to_message_id, reply_to_telegram_id, reply_markup
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
        new Date(message.date * 1000).toISOString(),
        fileName,
        fileSize,
        mimeType,
        duration,
        width,
        height,
        replyToMessageId,
        replyToTelegramId,
        replyMarkup ? JSON.stringify(replyMarkup) : null
      ]
    );

    if (!newMessage) {
      throw new Error('Failed to store message');
    }

    // Update conversation
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

    // Emit real-time events
    emitNewMessage(conversation.id, newMessage);

    const fullConversation = await db.queryOne(
      `SELECT c.*,
        json_build_object(
          'id', co.id, 'name', co.name, 'telegram_id', co.telegram_id,
          'email', co.email, 'phone', co.phone, 'avatar_url', co.avatar_url,
          'username', co.username
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
 * Process edited message from Telegram
 */
async function processEditedMessage(message) {
  try {
    const channel = await db.queryOne(
      `SELECT user_id FROM channels WHERE channel_type = 'telegram' AND is_active = true LIMIT 1`
    );
    const userId = channel?.user_id || null;

    // Find the conversation
    const conversation = await db.queryOne(
      `SELECT id FROM conversations WHERE channel_type = 'telegram' AND channel_chat_id = $1 AND user_id = $2`,
      [message.chat.id.toString(), userId]
    );
    if (!conversation) return { success: false, error: 'Conversation not found' };

    // Find the original message by telegram_message_id
    const existingMsg = await db.queryOne(
      `SELECT id FROM messages WHERE conversation_id = $1 AND telegram_message_id = $2`,
      [conversation.id, message.message_id]
    );

    if (!existingMsg) {
      // Message not found, process as new
      return processIncomingMessage(message);
    }

    const newText = message.text || message.caption || '';

    const updatedMessage = await db.queryOne(
      `UPDATE messages SET text = $1, is_edited = true, edited_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [newText, existingMsg.id]
    );

    if (updatedMessage) {
      emitMessageUpdated(conversation.id, updatedMessage);

      // Update conversation last message if this was the latest
      await db.query(
        `UPDATE conversations SET last_message_text = $1, updated_at = NOW()
         WHERE id = $2 AND last_message_time = (SELECT created_at FROM messages WHERE id = $3)`,
        [newText, conversation.id, existingMsg.id]
      );
    }

    console.log('Message edited:', existingMsg.id);
    return { success: true, message: updatedMessage };
  } catch (error) {
    console.error('Error processing edited message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process message reaction update
 */
async function processMessageReaction(reaction) {
  try {
    const channel = await db.queryOne(
      `SELECT user_id FROM channels WHERE channel_type = 'telegram' AND is_active = true LIMIT 1`
    );
    const userId = channel?.user_id || null;

    const conversation = await db.queryOne(
      `SELECT id FROM conversations WHERE channel_type = 'telegram' AND channel_chat_id = $1 AND user_id = $2`,
      [reaction.chat.id.toString(), userId]
    );
    if (!conversation) return;

    const msg = await db.queryOne(
      `SELECT id, reactions FROM messages WHERE conversation_id = $1 AND telegram_message_id = $2`,
      [conversation.id, reaction.message_id]
    );
    if (!msg) return;

    // Build reaction list from new_reaction
    const newReactions = (reaction.new_reaction || []).map(r => ({
      type: r.type,
      emoji: r.emoji || r.custom_emoji_id,
      user_id: reaction.user?.id?.toString()
    }));

    const updatedMessage = await db.queryOne(
      `UPDATE messages SET reactions = $1::jsonb, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [JSON.stringify(newReactions), msg.id]
    );

    if (updatedMessage) {
      emitMessageUpdated(conversation.id, updatedMessage);
    }
  } catch (error) {
    console.error('Error processing reaction:', error);
  }
}

/**
 * Store outgoing message in database
 */
async function storeOutgoingMessage(conversationId, text, telegramMessageId, extra = {}) {
  try {
    const {
      mediaType = null, mediaUrl = null, fileName = null, fileSize = null,
      mimeType = null, duration = null, width = null, height = null,
      replyToMessageId = null, replyMarkup = null
    } = extra;

    const newMessage = await db.queryOne(
      `INSERT INTO messages (
        conversation_id, sender_type, text, telegram_message_id, status,
        media_type, media_url, file_name, file_size, mime_type, duration, width, height,
        reply_to_message_id, reply_markup
      )
      VALUES ($1, 'admin', $2, $3, 'sent', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        conversationId, text, telegramMessageId,
        mediaType, mediaUrl, fileName, fileSize, mimeType, duration, width, height,
        replyToMessageId, replyMarkup ? JSON.stringify(replyMarkup) : null
      ]
    );

    if (!newMessage) {
      throw new Error('Failed to store outgoing message');
    }

    await db.queryOne(
      `UPDATE conversations
       SET last_message_text = $1, last_message_time = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [text || `(${mediaType})`, conversationId]
    );

    emitNewMessage(conversationId, newMessage);

    const fullConversation = await db.queryOne(
      `SELECT c.*,
        json_build_object(
          'id', co.id, 'name', co.name, 'telegram_id', co.telegram_id,
          'email', co.email, 'phone', co.phone, 'avatar_url', co.avatar_url,
          'username', co.username
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
  processEditedMessage,
  processMessageReaction,
  storeOutgoingMessage
};
