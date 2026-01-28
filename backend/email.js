const supabase = require('./supabase');

// Cache for SMTP transport
let transportCache = null;
let cachedConfig = null;

/**
 * Get email channel configuration from database
 */
async function getEmailConfig() {
  const { data, error } = await supabase
    .from('channels')
    .select('config, is_active')
    .eq('channel_type', 'email')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching email config:', error);
    throw error;
  }

  return data;
}

/**
 * Get or create nodemailer transport
 */
async function getTransport() {
  const channel = await getEmailConfig();

  if (!channel || !channel.is_active) {
    throw new Error('Email channel not configured or disabled');
  }

  const config = channel.config;

  if (!config.smtp) {
    throw new Error('SMTP configuration missing');
  }

  // Check if we need to recreate transport (config changed)
  const configHash = JSON.stringify(config.smtp);
  if (transportCache && cachedConfig === configHash) {
    return transportCache;
  }

  // Dynamic import nodemailer
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (e) {
    throw new Error('Nodemailer not installed. Run: npm install nodemailer');
  }

  transportCache = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.password
    }
  });

  cachedConfig = configHash;
  console.log('✅ Email transport created');

  return transportCache;
}

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 * @param {object} options - Additional options
 */
async function sendEmail(to, subject, text, html = null, options = {}) {
  try {
    const transport = await getTransport();
    const channel = await getEmailConfig();
    const config = channel.config;

    const mailOptions = {
      from: config.from_name
        ? `"${config.from_name}" <${config.from_email}>`
        : config.from_email,
      to,
      subject,
      text,
      html: html || text,
      ...options
    };

    console.log(`📧 Sending email to ${to}: ${subject}`);

    const info = await transport.sendMail(mailOptions);

    console.log('✅ Email sent:', info.messageId);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test SMTP connection
 * @param {object} config - SMTP config to test
 */
async function testConnection(config) {
  try {
    if (!config.smtp) {
      return { success: false, error: 'SMTP configuration required' };
    }

    let nodemailer;
    try {
      nodemailer = require('nodemailer');
    } catch (e) {
      return { success: false, error: 'Nodemailer not installed' };
    }

    const transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password
      }
    });

    await transport.verify();

    return {
      success: true,
      message: 'SMTP connection successful'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clear transport cache (call when config changes)
 */
function clearCache() {
  transportCache = null;
  cachedConfig = null;
  console.log('📧 Email transport cache cleared');
}

/**
 * Check if email channel is configured and active
 */
async function isConfigured() {
  try {
    const channel = await getEmailConfig();
    return channel && channel.is_active && channel.config?.smtp?.host;
  } catch (error) {
    return false;
  }
}

module.exports = {
  sendEmail,
  testConnection,
  clearCache,
  isConfigured,
  getEmailConfig
};
