const express = require('express');
const router = express.Router();
const { processIncomingMessage } = require('../utils/processMessage');

/**
 * POST /api/telegram/webhook
 * Receives updates from Telegram
 */
router.post('/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('📬 Received Telegram update:', update.update_id);

    // Handle different types of updates
    if (update.message) {
      // Regular message
      await processIncomingMessage(update.message);
    } else if (update.edited_message) {
      // Edited message (optional: handle differently)
      console.log('✏️ Message edited, processing...');
      await processIncomingMessage(update.edited_message);
    } else if (update.channel_post) {
      // Channel post
      await processIncomingMessage(update.channel_post);
    } else {
      console.log('ℹ️ Unhandled update type:', Object.keys(update));
    }

    // Always respond with 200 to acknowledge receipt
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error in webhook handler:', error);
    // Still send 200 to prevent Telegram from retrying
    res.sendStatus(200);
  }
});

/**
 * GET /api/telegram/webhook
 * Health check endpoint
 */
router.get('/telegram/webhook', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
