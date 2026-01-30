require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const telegram = require('./telegram');
const db = require('./db');
const { setupSocket } = require('./socket');

// Import routes
const webhookRoutes = require('./routes/webhook');
const messagesRoutes = require('./routes/messages');
const conversationsRoutes = require('./routes/conversations');
const channelsRoutes = require('./routes/channels');
const emailWebhookRoutes = require('./routes/emailWebhook');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = setupSocket(server);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files from frontend build (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  } else {
    res.json({
      status: 'ok',
      message: 'TeleDash Backend Server',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api', webhookRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/email', emailWebhookRoutes);

// Webhook management endpoints
app.post('/api/webhook/set', async (req, res) => {
  try {
    const { url } = req.body;
    const webhookUrl = url || process.env.WEBHOOK_URL;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL is required. Provide it in request body or set WEBHOOK_URL env variable.'
      });
    }

    const success = await telegram.setWebhook(webhookUrl);

    if (success) {
      res.json({
        success: true,
        message: 'Webhook set successfully',
        url: `${webhookUrl}/api/telegram/webhook`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to set webhook'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/webhook/delete', async (req, res) => {
  try {
    const success = await telegram.deleteWebhook();

    if (success) {
      res.json({
        success: true,
        message: 'Webhook deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete webhook'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve frontend for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
async function startServer() {
  // Test database connection
  const dbConnected = await db.testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Please check DATABASE_URL.');
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('       TeleDash Backend Server          ');
    console.log('========================================');
    console.log('');
    console.log(`Server running on port ${PORT}`);
    console.log(`Local URL: http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Database: Connected');
    console.log('Socket.io: Initialized');
    console.log('');
    console.log('Available endpoints:');
    console.log(`   GET  /api/health - Health check`);
    console.log(`   POST /api/telegram/webhook - Telegram webhook`);
    console.log(`   POST /api/email/webhook - Email webhook`);
    console.log(`   GET  /api/conversations - Get conversations`);
    console.log(`   POST /api/messages/send - Send message`);
    console.log(`   GET  /api/channels - Get channel settings`);
    console.log(`   POST /api/channels/:type - Update channel settings`);
    console.log(`   POST /api/webhook/set - Set Telegram webhook`);
    console.log('');
  });
}

startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    db.pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close(() => {
    db.pool.end();
    process.exit(0);
  });
});

module.exports = { app, server, io };
