const db = require('./db');
const { resolveEmailConfig } = require('./email');
const { emitNewMessage, emitConversationUpdated, emitNewConversation } = require('./socket');

let pollingInterval = null;
let isPolling = false;

/**
 * Find or create a contact by email address
 */
async function findOrCreateEmailContact(fromEmail, fromName) {
  const existing = await db.queryOne(
    'SELECT * FROM contacts WHERE email = $1',
    [fromEmail]
  );

  if (existing) return existing;

  const name = fromName || fromEmail.split('@')[0];
  const newContact = await db.queryOne(
    `INSERT INTO contacts (email, name, tags) VALUES ($1, $2, $3) RETURNING *`,
    [fromEmail, name, '{}']
  );

  console.log('Created email contact:', name);
  return newContact;
}

/**
 * Find or create an email conversation
 */
async function findOrCreateEmailConversation(emailAddress, contactId) {
  const existing = await db.queryOne(
    `SELECT * FROM conversations WHERE channel_type = 'email' AND channel_chat_id = $1`,
    [emailAddress]
  );

  if (existing) return { conversation: existing, isNew: false };

  const newConv = await db.queryOne(
    `INSERT INTO conversations (channel_type, channel_chat_id, contact_id, unread_count)
     VALUES ('email', $1, $2, 0) RETURNING *`,
    [emailAddress, contactId]
  );

  console.log('Created email conversation:', newConv.id);
  return { conversation: newConv, isNew: true };
}

/**
 * Parse email address from "Name <email>" format
 */
function parseEmailAddress(addr) {
  if (!addr) return { email: '', name: '' };

  if (typeof addr === 'object') {
    // imapflow returns objects with address and name
    return { email: addr.address || '', name: addr.name || '' };
  }

  const match = String(addr).match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    return { email: match[2], name: match[1] || '' };
  }
  return { email: String(addr), name: '' };
}

/**
 * Process a single email message
 */
async function processEmail(msg, emailConfig) {
  try {
    const from = msg.envelope?.from?.[0];
    if (!from) return;

    const fromEmail = from.address;
    const fromName = from.name || '';

    // Skip emails from ourselves
    if (fromEmail === emailConfig.email) return;

    const subject = msg.envelope?.subject || '(No subject)';
    const messageId = msg.envelope?.messageId || msg.uid?.toString();

    // Check if we already processed this message
    const existing = await db.queryOne(
      `SELECT id FROM messages WHERE telegram_message_id = $1::text AND conversation_id IN (
        SELECT id FROM conversations WHERE channel_type = 'email'
      )`,
      [messageId]
    );
    if (existing) return;

    // Get text body from raw source
    let bodyText = '';
    if (msg.source) {
      const raw = msg.source.toString();
      // Try to extract body after double newline (headers end)
      const headerEnd = raw.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        bodyText = raw.substring(headerEnd + 4);
      } else {
        bodyText = raw;
      }
    }

    // Strip HTML tags and decode entities
    bodyText = bodyText
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/=\r?\n/g, '') // quoted-printable soft line breaks
      .replace(/\r\n/g, '\n')
      .trim();

    // Limit body length
    if (bodyText.length > 5000) {
      bodyText = bodyText.substring(0, 5000) + '...';
    }

    const displayText = subject !== '(No subject)'
      ? `[${subject}] ${bodyText}`
      : bodyText || '(Empty email)';

    // Find or create contact and conversation
    const contact = await findOrCreateEmailContact(fromEmail, fromName);
    const { conversation, isNew } = await findOrCreateEmailConversation(fromEmail, contact.id);

    // Store message
    const newMessage = await db.queryOne(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, text, telegram_message_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        conversation.id,
        'user',
        fromEmail,
        displayText,
        messageId,
        'sent',
        msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : new Date().toISOString()
      ]
    );

    // Update conversation
    const updatedConv = await db.queryOne(
      `UPDATE conversations
       SET last_message_text = $1, last_message_time = $2, unread_count = unread_count + 1, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [
        displayText.substring(0, 200),
        msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : new Date().toISOString(),
        conversation.id
      ]
    );

    // Emit real-time events
    emitNewMessage(conversation.id, newMessage);

    const fullConversation = await db.queryOne(
      `SELECT c.*,
        json_build_object('id', co.id, 'name', co.name, 'telegram_id', co.telegram_id, 'email', co.email, 'phone', co.phone, 'avatar_url', co.avatar_url) as contact
       FROM conversations c LEFT JOIN contacts co ON c.contact_id = co.id WHERE c.id = $1`,
      [conversation.id]
    );

    if (isNew) {
      emitNewConversation(fullConversation);
    } else {
      emitConversationUpdated(fullConversation);
    }

    console.log(`Email received from ${fromEmail}: ${subject}`);
  } catch (error) {
    console.error('Error processing email:', error.message);
  }
}

/**
 * Poll IMAP inbox for new messages
 */
async function pollInbox() {
  if (isPolling) return;
  isPolling = true;

  try {
    const channel = await db.queryOne(
      `SELECT config, is_active FROM channels WHERE channel_type = 'email' LIMIT 1`
    );

    if (!channel || !channel.is_active) {
      isPolling = false;
      return;
    }

    const config = channel.config;
    if (!config.email && !config.smtp?.user) {
      isPolling = false;
      return;
    }

    const { imap } = resolveEmailConfig(config);
    if (!imap) {
      isPolling = false;
      return;
    }

    let ImapFlow;
    try {
      ImapFlow = require('imapflow').ImapFlow;
    } catch (e) {
      console.error('imapflow not installed. Run: npm install imapflow');
      isPolling = false;
      return;
    }

    const client = new ImapFlow({
      host: imap.host,
      port: imap.port,
      secure: imap.secure !== false,
      auth: {
        user: config.email || config.smtp?.user,
        pass: config.password || config.smtp?.password,
      },
      logger: false,
    });

    console.log(`IMAP: connecting to ${imap.host}:${imap.port} as ${config.email || config.smtp?.user}`);
    await client.connect();
    console.log('IMAP: connected');

    const lock = await client.getMailboxLock('INBOX');

    try {
      // Check mailbox status
      const status = client.mailbox;
      console.log(`IMAP: INBOX has ${status.exists} total, ${status.unseen || 0} unseen`);

      if (!status.exists || status.exists === 0) {
        console.log('IMAP: inbox empty, skipping');
      } else {
        // Fetch unseen messages
        const messages = [];
        try {
          for await (const msg of client.fetch({ seen: false }, {
            envelope: true,
            uid: true,
            source: true,
          })) {
            messages.push(msg);
          }
        } catch (fetchErr) {
          // "Nothing to fetch" is normal when no unseen messages
          if (!fetchErr.message?.includes('Nothing to fetch')) {
            console.error('IMAP fetch error:', fetchErr.message);
          } else {
            console.log('IMAP: no unseen messages');
          }
        }

        if (messages.length > 0) {
          console.log(`IMAP: found ${messages.length} new email(s)`);

          for (const msg of messages) {
            await processEmail(msg, config);

            // Mark as seen
            try {
              await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
            } catch (e) {
              // Ignore flag errors
            }
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    console.log('IMAP: poll complete');
  } catch (error) {
    console.error('IMAP poll error:', error.message);
  } finally {
    isPolling = false;
  }
}

/**
 * Start IMAP polling
 */
function startPolling(intervalMs = 30000) {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  console.log(`IMAP polling started (every ${intervalMs / 1000}s)`);

  // Poll immediately, then on interval
  setTimeout(() => pollInbox(), 5000);
  pollingInterval = setInterval(pollInbox, intervalMs);
}

/**
 * Stop IMAP polling
 */
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('IMAP polling stopped');
  }
}

module.exports = {
  startPolling,
  stopPolling,
  pollInbox,
};
