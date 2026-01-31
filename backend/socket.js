// Socket.io Real-time Server
// Replaces Supabase Realtime

const { Server } = require('socket.io');
const { verifyToken } = require('./auth');

let io = null;

// Setup Socket.io server
function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const user = verifyToken(token);
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id} (user: ${socket.user?.email})`);

    // Auto-join user-specific room
    socket.join(`user:${socket.user.id}`);

    // Join conversation room
    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation:${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} left conversation:${conversationId}`);
    });

    // Join conversations list room (for new conversation notifications)
    socket.on('join-conversations-list', () => {
      socket.join('conversations-list');
      console.log(`Socket ${socket.id} joined conversations-list`);
    });

    // Leave conversations list room
    socket.on('leave-conversations-list', () => {
      socket.leave('conversations-list');
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log('Socket.io server initialized');
  return io;
}

// Get the io instance
function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized. Call setupSocket first.');
  }
  return io;
}

// Emit new message to conversation room
function emitNewMessage(conversationId, message) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit('new-message', message);
    console.log(`Emitted new-message to conversation:${conversationId}`);
  }
}

// Emit message updated
function emitMessageUpdated(conversationId, message) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit('message-updated', message);
  }
}

// Emit conversation updated (for unread count, last message, etc.)
function emitConversationUpdated(conversation) {
  if (io) {
    // Send to user room if user_id is available, otherwise broadcast to conversations-list
    if (conversation.user_id) {
      io.to(`user:${conversation.user_id}`).emit('conversation-updated', conversation);
    } else {
      io.to('conversations-list').emit('conversation-updated', conversation);
    }
    io.to(`conversation:${conversation.id}`).emit('conversation-updated', conversation);
  }
}

// Emit new conversation created
function emitNewConversation(conversation) {
  if (io) {
    if (conversation.user_id) {
      io.to(`user:${conversation.user_id}`).emit('new-conversation', conversation);
    } else {
      io.to('conversations-list').emit('new-conversation', conversation);
    }
    console.log(`Emitted new-conversation`);
  }
}

// Emit conversation deleted
function emitConversationDeleted(conversationId, userId) {
  if (io) {
    if (userId) {
      io.to(`user:${userId}`).emit('conversation-deleted', { id: conversationId });
    } else {
      io.to('conversations-list').emit('conversation-deleted', { id: conversationId });
    }
  }
}

// Emit message deleted
function emitMessageDeleted(conversationId, messageId) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit('message-deleted', { id: messageId, conversation_id: conversationId });
  }
}

// Emit typing indicator
function emitTypingIndicator(conversationId, userId, isTyping) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit('typing', { conversation_id: conversationId, user_id: userId, is_typing: isTyping });
  }
}

module.exports = {
  setupSocket,
  getIO,
  emitNewMessage,
  emitMessageUpdated,
  emitConversationUpdated,
  emitNewConversation,
  emitConversationDeleted,
  emitMessageDeleted,
  emitTypingIndicator
};
