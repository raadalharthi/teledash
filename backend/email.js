const db = require('./db');

// Known email providers with auto-detected IMAP/SMTP settings
const KNOWN_PROVIDERS = {
  'gmail.com': {
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
  },
  'googlemail.com': {
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
  },
  'outlook.com': {
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false },
  },
  'hotmail.com': {
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false },
  },
  'live.com': {
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false },
  },
  'yahoo.com': {
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
  },
  'ymail.com': {
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
  },
  'icloud.com': {
    imap: { host: 'imap.mail.me.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false },
  },
  'me.com': {
    imap: { host: 'imap.mail.me.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false },
  },
  'mac.com': {
    imap: { host: 'imap.mail.me.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false },
  },
};

/**
 * Detect IMAP/SMTP settings from email address
 */
function detectProvider(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  return KNOWN_PROVIDERS[domain] || null;
}

/**
 * Get resolved IMAP/SMTP config (manual overrides > auto-detected > null)
 */
function resolveEmailConfig(config) {
  const detected = detectProvider(config.email);

  const imap = config.imap?.host
    ? config.imap
    : detected?.imap || null;

  const smtp = config.smtp?.host
    ? config.smtp
    : detected?.smtp || null;

  return { imap, smtp };
}

// Cache for SMTP transport
let transportCache = null;
let cachedConfig = null;

async function getEmailConfig() {
  const result = await db.queryOne(
    `SELECT config, is_active FROM channels WHERE channel_type = 'email' LIMIT 1`
  );
  return result;
}

async function getTransport() {
  const channel = await getEmailConfig();
  if (!channel || !channel.is_active) {
    throw new Error('Email channel not configured or disabled');
  }

  const config = channel.config;
  const { smtp } = resolveEmailConfig(config);

  if (!smtp) {
    throw new Error('SMTP configuration could not be determined. Use Advanced Settings to set manually.');
  }

  const configHash = JSON.stringify({ host: smtp.host, port: smtp.port, user: config.email });
  if (transportCache && cachedConfig === configHash) {
    return { transport: transportCache, config };
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (e) {
    throw new Error('Nodemailer not installed. Run: npm install nodemailer');
  }

  transportCache = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: config.email || config.smtp?.user,
      pass: config.password || config.smtp?.password,
    },
  });

  cachedConfig = configHash;
  console.log('Email transport created for', smtp.host);

  return { transport: transportCache, config };
}

async function sendEmail(to, subject, text, html = null, options = {}) {
  try {
    const { transport, config } = await getTransport();

    const fromName = config.display_name || config.from_name;
    const fromEmail = config.email || config.from_email;

    const mailOptions = {
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to,
      subject,
      text,
      html: html || text,
      ...options,
    };

    console.log(`Sending email to ${to}: ${subject}`);
    const info = await transport.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

async function testConnection(config) {
  try {
    const { smtp } = resolveEmailConfig(config);

    if (!smtp) {
      return { success: false, error: 'Could not detect SMTP settings for this email. Use Advanced Settings.' };
    }

    if (!config.email && !config.smtp?.user) {
      return { success: false, error: 'Email address is required' };
    }

    let nodemailer;
    try {
      nodemailer = require('nodemailer');
    } catch (e) {
      return { success: false, error: 'Nodemailer not installed' };
    }

    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: config.email || config.smtp?.user,
        pass: config.password || config.smtp?.password,
      },
    });

    await transport.verify();

    return { success: true, message: `SMTP connection to ${smtp.host} successful` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function clearCache() {
  transportCache = null;
  cachedConfig = null;
  console.log('Email transport cache cleared');
}

async function isConfigured() {
  try {
    const channel = await getEmailConfig();
    if (!channel || !channel.is_active) return false;
    const config = channel.config;
    return !!(config.email || config.smtp?.host);
  } catch (error) {
    return false;
  }
}

module.exports = {
  sendEmail,
  testConnection,
  clearCache,
  isConfigured,
  getEmailConfig,
  detectProvider,
  resolveEmailConfig,
  KNOWN_PROVIDERS,
};
