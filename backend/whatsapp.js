/**
 * WhatsApp Integration via Evolution API
 * Mirrors the telegram.js pattern for consistency
 */

require('dotenv').config();
const db = require('./db');

// Cache for API client
let apiClient = null;
let cachedConfigHash = null;

/**
 * Get WhatsApp channel config from database
 */
async function getConfig(userId = null) {
  const query = userId
    ? 'SELECT config, is_active, user_id FROM channels WHERE channel_type = $1 AND user_id = $2'
    : 'SELECT config, is_active, user_id FROM channels WHERE channel_type = $1 AND is_active = true LIMIT 1';
  const params = userId ? ['whatsapp', userId] : ['whatsapp'];

  const channel = await db.queryOne(query, params);
  if (channel && channel.config?.evolution_api_url) {
    return { ...channel.config, user_id: channel.user_id, is_active: channel.is_active };
  }
  return null;
}

/**
 * Create Evolution API client wrapper
 */
async function getClient(userId = null, forceRefresh = false) {
  const config = await getConfig(userId);
  if (!config) {
    throw new Error('WhatsApp not configured. Please configure it in Settings.');
  }

  const configHash = JSON.stringify({
    url: config.evolution_api_url,
    key: config.api_key,
    instance: config.instance_name
  });

  if (apiClient && cachedConfigHash === configHash && !forceRefresh) {
    return apiClient;
  }

  const baseUrl = config.evolution_api_url.replace(/\/$/, '');

  apiClient = {
    baseUrl,
    apiKey: config.api_key,
    instanceName: config.instance_name,
    userId: config.user_id,

    async request(method, endpoint, body = null) {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`WhatsApp API ${method} ${endpoint}`);

      try {
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
          }
        };

        if (body && method !== 'GET') {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
          console.error('WhatsApp API error:', data);
          throw new Error(data.message || data.error || 'API request failed');
        }

        return data;
      } catch (error) {
        console.error('WhatsApp API request failed:', error);
        throw error;
      }
    }
  };

  cachedConfigHash = configHash;
  return apiClient;
}

/**
 * Clear cached client (call after config changes)
 */
function clearCache() {
  apiClient = null;
  cachedConfigHash = null;
}

/**
 * Check if WhatsApp is configured
 */
async function isConfigured() {
  const config = await getConfig();
  return !!(config?.evolution_api_url && config?.api_key && config?.instance_name);
}

// ============================================
// Instance Management
// ============================================

/**
 * Create a new Evolution API instance
 */
async function createInstance(instanceName, userId = null) {
  const config = await getConfig(userId);
  if (!config) throw new Error('WhatsApp not configured');

  const baseUrl = config.evolution_api_url.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/instance/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.api_key
    },
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    })
  });

  return response.json();
}

/**
 * Get instance connection status
 */
async function getInstanceStatus(userId = null) {
  try {
    const client = await getClient(userId);
    return await client.request('GET', `/instance/connectionState/${client.instanceName}`);
  } catch (error) {
    return { state: 'close', error: error.message };
  }
}

/**
 * Get QR code for pairing
 */
async function getQRCode(userId = null) {
  try {
    const client = await getClient(userId);
    const result = await client.request('GET', `/instance/connect/${client.instanceName}`);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Logout and disconnect instance
 */
async function logout(userId = null) {
  try {
    const client = await getClient(userId);
    await client.request('DELETE', `/instance/logout/${client.instanceName}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Restart instance
 */
async function restartInstance() {
  try {
    const client = await getClient();
    await client.request('POST', `/instance/restart/${client.instanceName}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// Messaging
// ============================================

/**
 * Send text message
 * @param {string} remoteJid - WhatsApp JID (e.g., "5511999999999@s.whatsapp.net" or just phone number)
 * @param {string} text - Message text
 * @param {object} options - Optional: quotedMessageId for replies
 */
async function sendMessage(remoteJid, text, options = {}) {
  try {
    const client = await getClient();

    // Normalize phone number to JID format if needed
    const number = remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid;

    const body = {
      number,
      text
    };

    // Handle reply/quote
    if (options.quotedMessageId) {
      body.options = {
        quoted: {
          key: {
            id: options.quotedMessageId
          }
        }
      };
    }

    const result = await client.request('POST', `/message/sendText/${client.instanceName}`, body);
    return { success: true, message: result };
  } catch (error) {
    console.error('WhatsApp sendMessage error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send media message (image, video, audio, document)
 * @param {string} remoteJid - WhatsApp JID or phone number
 * @param {string} mediaType - 'image', 'video', 'audio', 'document', 'sticker'
 * @param {string} mediaUrl - URL of the media file
 * @param {object} options - caption, fileName, quotedMessageId
 */
async function sendMedia(remoteJid, mediaType, mediaUrl, options = {}) {
  try {
    const client = await getClient();
    const number = remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid;

    const endpointMap = {
      image: 'sendImage',
      photo: 'sendImage',
      video: 'sendVideo',
      audio: 'sendAudio',
      voice: 'sendAudio',
      document: 'sendDocument',
      sticker: 'sendSticker'
    };

    const endpoint = endpointMap[mediaType] || 'sendDocument';

    const body = {
      number,
      media: mediaUrl
    };

    if (options.caption) {
      body.caption = options.caption;
    }

    if (options.fileName) {
      body.fileName = options.fileName;
    }

    if (options.quotedMessageId) {
      body.options = {
        quoted: {
          key: { id: options.quotedMessageId }
        }
      };
    }

    const result = await client.request('POST', `/message/${endpoint}/${client.instanceName}`, body);
    return { success: true, message: result };
  } catch (error) {
    console.error('WhatsApp sendMedia error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send location message
 */
async function sendLocation(remoteJid, latitude, longitude, options = {}) {
  try {
    const client = await getClient();
    const number = remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid;

    const result = await client.request('POST', `/message/sendLocation/${client.instanceName}`, {
      number,
      latitude,
      longitude,
      name: options.name || '',
      address: options.address || ''
    });

    return { success: true, message: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send contact card
 */
async function sendContact(remoteJid, contact) {
  try {
    const client = await getClient();
    const number = remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid;

    const result = await client.request('POST', `/message/sendContact/${client.instanceName}`, {
      number,
      contact
    });

    return { success: true, message: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// Chat Actions
// ============================================

/**
 * Mark messages as read
 */
async function markAsRead(remoteJid, messageIds) {
  try {
    const client = await getClient();

    const readMessages = messageIds.map(id => ({
      remoteJid,
      id
    }));

    await client.request('POST', `/chat/markMessageAsRead/${client.instanceName}`, {
      readMessages
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send presence/typing indicator
 * @param {string} presence - 'composing', 'recording', 'paused'
 */
async function sendPresence(remoteJid, presence = 'composing') {
  try {
    const client = await getClient();
    const number = remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid;

    await client.request('POST', `/chat/sendPresence/${client.instanceName}`, {
      number,
      presence
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get profile picture URL
 */
async function getProfilePicture(remoteJid) {
  try {
    const client = await getClient();
    const number = remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid;

    const result = await client.request(
      'GET',
      `/chat/profilePicture/${client.instanceName}?number=${number}`
    );

    return { success: true, url: result.profilePictureUrl || result.picture };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if number is registered on WhatsApp
 */
async function checkNumber(phoneNumber) {
  try {
    const client = await getClient();
    const result = await client.request('POST', `/chat/whatsappNumbers/${client.instanceName}`, {
      numbers: [phoneNumber]
    });

    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// Webhook Configuration
// ============================================

/**
 * Set webhook URL for receiving events
 */
async function setWebhook(webhookUrl, events = null) {
  try {
    const client = await getClient();

    const defaultEvents = [
      'MESSAGES_UPSERT',
      'MESSAGES_UPDATE',
      'MESSAGES_DELETE',
      'CONNECTION_UPDATE',
      'QRCODE_UPDATED',
      'SEND_MESSAGE'
    ];

    const result = await client.request('POST', `/webhook/set/${client.instanceName}`, {
      url: webhookUrl,
      webhook_by_events: false,
      events: events || defaultEvents
    });

    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get current webhook configuration
 */
async function getWebhook() {
  try {
    const client = await getClient();
    const result = await client.request('GET', `/webhook/find/${client.instanceName}`);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  // Config
  getConfig,
  getClient,
  clearCache,
  isConfigured,

  // Instance management
  createInstance,
  getInstanceStatus,
  getQRCode,
  logout,
  restartInstance,

  // Messaging
  sendMessage,
  sendMedia,
  sendLocation,
  sendContact,

  // Chat actions
  markAsRead,
  sendPresence,
  getProfilePicture,
  checkNumber,

  // Webhook
  setWebhook,
  getWebhook
};
