require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

// Bot instance cache
let bot = null;
let cachedToken = null;

/**
 * Get Telegram bot token from database or .env fallback
 */
async function getBotToken() {
  try {
    // Try to get from database first
    const channel = await db.queryOne(
      `SELECT config, is_active FROM channels WHERE channel_type = $1`,
      ['telegram']
    );

    if (channel && channel.is_active && channel.config?.bot_token) {
      console.log('Using Telegram token from database');
      return channel.config.bot_token;
    }
  } catch (error) {
    // Database might not be set up yet, that's okay
    console.log('Database token not found, checking .env');
  }

  // Fall back to .env
  if (process.env.TELEGRAM_BOT_TOKEN) {
    console.log('Using Telegram token from .env file');
    return process.env.TELEGRAM_BOT_TOKEN;
  }

  return null;
}

/**
 * Get or create bot instance
 * @param {boolean} forceRefresh - Force refresh the bot instance
 */
async function getBot(forceRefresh = false) {
  const token = await getBotToken();

  if (!token) {
    throw new Error('Telegram bot token not configured. Set it in Settings or .env file.');
  }

  // Return cached bot if token hasn't changed
  if (bot && cachedToken === token && !forceRefresh) {
    return bot;
  }

  // Create new bot instance
  bot = new TelegramBot(token, { polling: false });
  cachedToken = token;
  console.log('Telegram bot initialized');

  return bot;
}

/**
 * Clear bot cache (call when config changes)
 */
function clearBotCache() {
  bot = null;
  cachedToken = null;
  console.log('Telegram bot cache cleared');
}

/**
 * Check if Telegram is configured
 */
async function isConfigured() {
  const token = await getBotToken();
  return !!token;
}

/**
 * Set webhook for Telegram bot
 * @param {string} url - The base webhook URL (e.g., https://your-domain.com)
 */
async function setWebhook(url) {
  try {
    const telegramBot = await getBot();
    const webhookUrl = `${url}/api/telegram/webhook`;
    await telegramBot.setWebHook(webhookUrl);
    console.log(`Telegram webhook set successfully: ${webhookUrl}`);

    // Verify webhook info
    const info = await telegramBot.getWebHookInfo();
    console.log('Webhook info:', {
      url: info.url,
      has_custom_certificate: info.has_custom_certificate,
      pending_update_count: info.pending_update_count
    });

    return true;
  } catch (error) {
    console.error('Error setting webhook:', error.message);
    return false;
  }
}

/**
 * Delete webhook (useful for switching back to polling during development)
 */
async function deleteWebhook() {
  try {
    const telegramBot = await getBot();
    await telegramBot.deleteWebHook();
    console.log('Webhook deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting webhook:', error.message);
    return false;
  }
}

/**
 * Send a text message
 * @param {string|number} chatId - The chat ID
 * @param {string} text - The message text
 * @param {object} options - Additional options
 */
async function sendMessage(chatId, text, options = {}) {
  try {
    const telegramBot = await getBot();
    const message = await telegramBot.sendMessage(chatId, text, options);
    return { success: true, message };
  } catch (error) {
    console.error('Error sending message:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a photo
 * @param {string|number} chatId - The chat ID
 * @param {string} photo - Photo URL or file_id
 * @param {object} options - Additional options
 */
async function sendPhoto(chatId, photo, options = {}) {
  try {
    const telegramBot = await getBot();
    const message = await telegramBot.sendPhoto(chatId, photo, options);
    return { success: true, message };
  } catch (error) {
    console.error('Error sending photo:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a document
 * @param {string|number} chatId - The chat ID
 * @param {string} document - Document URL or file_id
 * @param {object} options - Additional options
 */
async function sendDocument(chatId, document, options = {}) {
  try {
    const telegramBot = await getBot();
    const message = await telegramBot.sendDocument(chatId, document, options);
    return { success: true, message };
  } catch (error) {
    console.error('Error sending document:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a video
 */
async function sendVideo(chatId, video, options = {}) {
  try {
    const telegramBot = await getBot();
    const message = await telegramBot.sendVideo(chatId, video, options);
    return { success: true, message };
  } catch (error) {
    console.error('Error sending video:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a voice message
 */
async function sendVoice(chatId, voice, options = {}) {
  try {
    const telegramBot = await getBot();
    const message = await telegramBot.sendVoice(chatId, voice, options);
    return { success: true, message };
  } catch (error) {
    console.error('Error sending voice:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send an audio file
 */
async function sendAudio(chatId, audio, options = {}) {
  try {
    const telegramBot = await getBot();
    const message = await telegramBot.sendAudio(chatId, audio, options);
    return { success: true, message };
  } catch (error) {
    console.error('Error sending audio:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Edit a message text
 */
async function editMessageText(chatId, messageId, text, options = {}) {
  try {
    const telegramBot = await getBot();
    const message = await telegramBot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      ...options
    });
    return { success: true, message };
  } catch (error) {
    console.error('Error editing message:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a message
 */
async function deleteMessage(chatId, messageId) {
  try {
    const telegramBot = await getBot();
    await telegramBot.deleteMessage(chatId, messageId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send chat action (typing indicator)
 */
async function sendChatAction(chatId, action = 'typing') {
  try {
    const telegramBot = await getBot();
    await telegramBot.sendChatAction(chatId, action);
    return { success: true };
  } catch (error) {
    console.error('Error sending chat action:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Set message reaction
 */
async function setMessageReaction(chatId, messageId, reaction) {
  try {
    const telegramBot = await getBot();
    const token = await getBotToken();
    // node-telegram-bot-api may not have this method, use raw API
    const url = `https://api.telegram.org/bot${token}/setMessageReaction`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reaction: reaction ? [{ type: 'emoji', emoji: reaction }] : [],
        is_big: false
      })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return { success: true };
  } catch (error) {
    console.error('Error setting reaction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get user profile photos
 */
async function getUserProfilePhotos(userId, limit = 1) {
  try {
    const telegramBot = await getBot();
    const result = await telegramBot.getUserProfilePhotos(userId, { limit });
    if (result.total_count > 0) {
      const photo = result.photos[0][result.photos[0].length - 1];
      const fileLink = await telegramBot.getFileLink(photo.file_id);
      return { success: true, photoUrl: fileLink, totalCount: result.total_count };
    }
    return { success: true, photoUrl: null, totalCount: 0 };
  } catch (error) {
    console.error('Error getting profile photos:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get chat info
 */
async function getChat(chatId) {
  try {
    const telegramBot = await getBot();
    const chat = await telegramBot.getChat(chatId);
    return { success: true, chat };
  } catch (error) {
    console.error('Error getting chat:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get file download link
 * @param {string} fileId - Telegram file_id
 */
async function getFileLink(fileId) {
  try {
    const telegramBot = await getBot();
    const fileLink = await telegramBot.getFileLink(fileId);
    return { success: true, fileLink };
  } catch (error) {
    console.error('Error getting file link:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process update from webhook (used by webhook route)
 * @param {object} update - Telegram update object
 */
async function processUpdate(update) {
  try {
    const telegramBot = await getBot();
    telegramBot.processUpdate(update);
  } catch (error) {
    console.error('Error processing update:', error.message);
  }
}

const getBotSync = () => bot;

module.exports = {
  getBot,
  getBotSync,
  getBotToken,
  clearBotCache,
  isConfigured,
  setWebhook,
  deleteWebhook,
  sendMessage,
  sendPhoto,
  sendDocument,
  sendVideo,
  sendVoice,
  sendAudio,
  editMessageText,
  deleteMessage,
  sendChatAction,
  setMessageReaction,
  getUserProfilePhotos,
  getChat,
  getFileLink,
  processUpdate
};
