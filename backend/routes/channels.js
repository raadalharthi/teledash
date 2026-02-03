const express = require('express');
const router = express.Router();
const db = require('../db');
const TelegramBot = require('node-telegram-bot-api');
const { testConnection: testEmailConn, resolveEmailConfig } = require('../email');
const whatsapp = require('../whatsapp');

/**
 * Mask sensitive fields in config for frontend display
 */
function maskConfig(config, channelType) {
  if (!config) return config;

  const masked = { ...config };

  if (channelType === 'telegram' && masked.bot_token) {
    masked.bot_token = '***' + masked.bot_token.slice(-4);
  }

  if (channelType === 'email') {
    // New simplified format
    if (masked.password) {
      masked.password = '********';
    }
    // Legacy SMTP format
    if (masked.smtp?.password) {
      masked.smtp = { ...masked.smtp, password: '********' };
    }
  }

  if (channelType === 'whatsapp' && masked.api_key) {
    masked.api_key = '***' + masked.api_key.slice(-4);
  }

  return masked;
}

/**
 * GET /api/channels
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, channel_type, is_active, created_at, updated_at
      FROM channels
      WHERE user_id = $1
      ORDER BY channel_type
    `, [req.user.id]);

    res.json({
      success: true,
      channels: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/channels/:type
 */
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const result = await db.queryOne(`SELECT * FROM channels WHERE channel_type = $1 AND user_id = $2`, [type, req.user.id]);

    if (!result) {
      return res.json({ success: true, channel: null });
    }

    res.json({
      success: true,
      channel: { ...result, config: maskConfig(result.config, type) }
    });
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/channels/:type
 */
router.post('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { config, is_active = true } = req.body;

    const validation = validateConfig(type, config);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const existing = await db.queryOne(`SELECT id, config FROM channels WHERE channel_type = $1 AND user_id = $2`, [type, req.user.id]);

    let result;

    if (existing) {
      const mergedConfig = mergeConfig(existing.config, config, type);
      result = await db.queryOne(`
        UPDATE channels SET config = $1, is_active = $2, updated_at = NOW()
        WHERE channel_type = $3 AND user_id = $4 RETURNING *
      `, [JSON.stringify(mergedConfig), is_active, type, req.user.id]);
    } else {
      result = await db.queryOne(`
        INSERT INTO channels (channel_type, config, is_active, user_id)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [type, JSON.stringify(config), is_active, req.user.id]);
    }

    console.log(`Channel ${type} saved successfully`);

    res.json({
      success: true,
      channel: { ...result, config: maskConfig(result.config, type) }
    });
  } catch (error) {
    console.error('Error saving channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/channels/:type/test
 */
router.post('/:type/test', async (req, res) => {
  try {
    const { type } = req.params;
    let { config } = req.body;

    // If password is masked, get the real password from database
    if (type === 'email') {
      const existing = await db.queryOne(`SELECT config FROM channels WHERE channel_type = 'email' AND user_id = $1`, [req.user.id]);
      if (existing) {
        // New format
        if (config.password === '********' && existing.config.password) {
          config = { ...config, password: existing.config.password };
        }
        // Legacy format
        if (config.smtp?.password === '********' && existing.config.smtp?.password) {
          config = { ...config, smtp: { ...config.smtp, password: existing.config.smtp.password } };
        }
      }
    }

    let result;

    switch (type) {
      case 'telegram':
        result = await testTelegramConnection(config);
        break;
      case 'email':
        result = await testEmailConn(config);
        break;
      case 'whatsapp':
        result = await testWhatsAppConnection(config);
        break;
      default:
        result = { success: false, error: 'Unknown channel type' };
    }

    res.json(result);
  } catch (error) {
    console.error('Error testing channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/channels/:type
 */
router.delete('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    await db.query(`UPDATE channels SET is_active = false WHERE channel_type = $1 AND user_id = $2`, [type, req.user.id]);
    console.log(`Channel ${type} disabled`);
    res.json({ success: true, message: `Channel ${type} disabled` });
  } catch (error) {
    console.error('Error disabling channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Validate channel config
 */
function validateConfig(type, config) {
  const errors = [];

  if (!config) {
    errors.push('Config is required');
    return { valid: false, errors };
  }

  switch (type) {
    case 'telegram':
      if (!config.bot_token) {
        errors.push('Bot token is required');
      } else if (!config.bot_token.startsWith('***') && !config.bot_token.match(/^\d+:[A-Za-z0-9_-]+$/)) {
        errors.push('Invalid bot token format');
      }
      break;

    case 'email':
      // Support both new simplified format (email + password) and legacy SMTP format
      if (config.email) {
        // New format - just need email, password is optional if already saved
        if (!config.password && config.password !== '********') {
          // Password might already be saved, allow save without it
        }
      } else if (config.smtp) {
        // Legacy format
        if (!config.smtp.host) errors.push('SMTP host is required');
        if (!config.smtp.user) errors.push('SMTP username is required');
      } else {
        errors.push('Email address is required');
      }
      break;

    case 'whatsapp':
      if (!config.evolution_api_url) {
        errors.push('Evolution API URL is required');
      }
      if (!config.api_key && !config.api_key?.startsWith('***')) {
        errors.push('API Key is required');
      }
      if (!config.instance_name) {
        errors.push('Instance name is required');
      }
      break;

    default:
      errors.push('Unknown channel type');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Merge new config with existing, keeping existing values for masked fields
 */
function mergeConfig(existingConfig, newConfig, type) {
  if (!existingConfig) return newConfig;

  const merged = { ...newConfig };

  if (type === 'telegram') {
    if (merged.bot_token?.startsWith('***')) {
      merged.bot_token = existingConfig.bot_token;
    }
  }

  if (type === 'email') {
    // New format password
    if (merged.password === '********' && existingConfig.password) {
      merged.password = existingConfig.password;
    }
    // Legacy SMTP password
    if (merged.smtp?.password === '********' && existingConfig.smtp?.password) {
      merged.smtp = { ...merged.smtp, password: existingConfig.smtp.password };
    }
  }

  if (type === 'whatsapp') {
    if (merged.api_key?.startsWith('***') && existingConfig.api_key) {
      merged.api_key = existingConfig.api_key;
    }
  }

  return merged;
}

/**
 * Test Telegram bot connection
 */
async function testTelegramConnection(config) {
  try {
    if (!config.bot_token || config.bot_token.startsWith('***')) {
      return { success: false, error: 'Please enter a valid bot token' };
    }

    const bot = new TelegramBot(config.bot_token, { polling: false });
    const me = await bot.getMe();

    return {
      success: true,
      message: `Connected to bot: @${me.username}`,
      bot_info: { username: me.username, first_name: me.first_name, id: me.id }
    };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to connect to Telegram' };
  }
}

/**
 * Test WhatsApp Evolution API connection
 */
async function testWhatsAppConnection(config) {
  try {
    if (!config.evolution_api_url || !config.instance_name) {
      return { success: false, error: 'Evolution API URL and Instance Name are required' };
    }

    // Skip if API key is masked
    if (config.api_key?.startsWith('***')) {
      return { success: false, error: 'Please save the configuration first before testing' };
    }

    const baseUrl = config.evolution_api_url.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/instance/connectionState/${config.instance_name}`, {
      headers: {
        'apikey': config.api_key,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error || 'Connection failed' };
    }

    const state = data.state || data.instance?.state || 'unknown';

    return {
      success: true,
      message: `Connected to instance: ${config.instance_name}`,
      state: state,
      connected: state === 'open'
    };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to connect to Evolution API' };
  }
}

// ============================================
// WhatsApp-specific routes
// ============================================

/**
 * GET /api/channels/whatsapp/qrcode
 * Get QR code for WhatsApp pairing
 */
router.get('/whatsapp/qrcode', async (req, res) => {
  try {
    const result = await whatsapp.getQRCode();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/channels/whatsapp/status
 * Get WhatsApp connection status
 */
router.get('/whatsapp/status', async (req, res) => {
  try {
    const result = await whatsapp.getInstanceStatus();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/channels/whatsapp/instance
 * Create a new WhatsApp instance
 */
router.post('/whatsapp/instance', async (req, res) => {
  try {
    const { instance_name } = req.body;
    if (!instance_name) {
      return res.status(400).json({ success: false, error: 'Instance name is required' });
    }
    const result = await whatsapp.createInstance(instance_name);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/channels/whatsapp/logout
 * Logout from WhatsApp
 */
router.post('/whatsapp/logout', async (req, res) => {
  try {
    const result = await whatsapp.logout();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/channels/whatsapp/webhook/set
 * Set webhook URL for Evolution API
 */
router.post('/whatsapp/webhook/set', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Webhook URL is required' });
    }
    const result = await whatsapp.setWebhook(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
