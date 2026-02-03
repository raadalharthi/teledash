/**
 * WhatsApp Webhook Routes
 * Receives events from Evolution API
 */

const express = require('express');
const router = express.Router();
const {
  processWhatsAppMessage,
  processWhatsAppStatus,
  processWhatsAppDelete,
  processWhatsAppConnection,
  processWhatsAppQRCode
} = require('../utils/processWhatsAppMessage');

/**
 * POST /api/whatsapp/webhook
 * Main webhook endpoint for Evolution API events
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    console.log('WhatsApp webhook received:', event.event, event.instance);

    switch (event.event) {
      case 'MESSAGES_UPSERT':
        // New message received or sent
        if (event.data && event.data.message) {
          await processWhatsAppMessage(event.data, event.instance);
        } else if (Array.isArray(event.data)) {
          for (const msg of event.data) {
            await processWhatsAppMessage(msg, event.instance);
          }
        }
        break;

      case 'MESSAGES_UPDATE':
        // Message status updated (delivered, read)
        if (event.data) {
          await processWhatsAppStatus(event.data, event.instance);
        }
        break;

      case 'MESSAGES_DELETE':
        // Message deleted
        if (event.data) {
          await processWhatsAppDelete(event.data, event.instance);
        }
        break;

      case 'CONNECTION_UPDATE':
        // Connection state changed (open, connecting, close)
        if (event.data) {
          await processWhatsAppConnection(event.data, event.instance);
        }
        break;

      case 'QRCODE_UPDATED':
        // QR code updated - emit to frontend
        if (event.data) {
          await processWhatsAppQRCode(event.data, event.instance);
        }
        break;

      case 'SEND_MESSAGE':
        // Outgoing message confirmation
        // Usually we already stored it when sending, but can update status
        console.log('WhatsApp SEND_MESSAGE event:', event.data?.key?.id);
        break;

      case 'PRESENCE_UPDATE':
        // Contact typing/online status
        console.log('WhatsApp presence update:', event.data);
        break;

      case 'CHATS_UPSERT':
      case 'CHATS_UPDATE':
      case 'CONTACTS_UPSERT':
      case 'CONTACTS_UPDATE':
        // Chat/contact sync events - can be used for contact import
        console.log(`WhatsApp ${event.event}:`, event.data?.length || 1, 'items');
        break;

      default:
        console.log('Unhandled WhatsApp event:', event.event);
    }

    // Always return 200 to prevent Evolution API retries
    res.sendStatus(200);
  } catch (error) {
    console.error('Error in WhatsApp webhook:', error);
    // Still return 200 to prevent retries
    res.sendStatus(200);
  }
});

/**
 * GET /api/whatsapp/webhook
 * Health check endpoint
 */
router.get('/webhook', (req, res) => {
  res.json({
    status: 'ok',
    message: 'WhatsApp webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
