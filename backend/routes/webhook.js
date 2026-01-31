const express = require('express');
const router = express.Router();
const { processIncomingMessage, processEditedMessage, processMessageReaction } = require('../utils/processMessage');
const db = require('../db');
const { emitMessageUpdated } = require('../socket');

/**
 * POST /api/telegram/webhook
 * Receives updates from Telegram
 */
router.post('/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('Received Telegram update:', update.update_id);

    if (update.message) {
      await processIncomingMessage(update.message);
    } else if (update.edited_message) {
      console.log('Message edited, processing...');
      await processEditedMessage(update.edited_message);
    } else if (update.channel_post) {
      await processIncomingMessage(update.channel_post);
    } else if (update.edited_channel_post) {
      await processEditedMessage(update.edited_channel_post);
    } else if (update.callback_query) {
      // Handle inline keyboard button presses
      console.log('Callback query:', update.callback_query.data);
      await processCallbackQuery(update.callback_query);
    } else if (update.message_reaction) {
      console.log('Message reaction update');
      await processMessageReaction(update.message_reaction);
    } else {
      console.log('Unhandled update type:', Object.keys(update));
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.sendStatus(200);
  }
});

/**
 * Process callback query (inline keyboard button press)
 */
async function processCallbackQuery(callbackQuery) {
  try {
    const { id, from, message, data } = callbackQuery;

    if (!message) return;

    const channel = await db.queryOne(
      `SELECT user_id FROM channels WHERE channel_type = 'telegram' AND is_active = true LIMIT 1`
    );
    const userId = channel?.user_id || null;

    const conversation = await db.queryOne(
      `SELECT id FROM conversations WHERE channel_type = 'telegram' AND channel_chat_id = $1 AND user_id = $2`,
      [message.chat.id.toString(), userId]
    );
    if (!conversation) return;

    const msg = await db.queryOne(
      `SELECT id FROM messages WHERE conversation_id = $1 AND telegram_message_id = $2`,
      [conversation.id, message.message_id]
    );
    if (!msg) return;

    // Store callback data
    const existingData = msg.callback_data || [];
    const newCallbackData = [...(Array.isArray(existingData) ? existingData : []), {
      data,
      from_id: from.id,
      from_name: [from.first_name, from.last_name].filter(Boolean).join(' '),
      timestamp: new Date().toISOString()
    }];

    const updatedMessage = await db.queryOne(
      `UPDATE messages SET callback_data = $1::jsonb, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [JSON.stringify(newCallbackData), msg.id]
    );

    if (updatedMessage) {
      emitMessageUpdated(conversation.id, updatedMessage);
    }

    // Answer callback query to remove loading state on button
    const telegram = require('../telegram');
    const bot = await telegram.getBot();
    await bot.answerCallbackQuery(id);
  } catch (error) {
    console.error('Error processing callback query:', error);
  }
}

/**
 * GET /api/telegram/webhook - Health check
 */
router.get('/telegram/webhook', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
