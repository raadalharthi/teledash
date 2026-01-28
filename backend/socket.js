// Socket.io Real-time Server
// Replaces Supabase Realtime

const { Server } = require('socket.io');

let io = null;

// Setup Socket.io server
function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Ping settings for connection health
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

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
    // Send to conversations list
    io.to('conversations-list').emit('conversation-updated', conversation);
    // Also send to the specific conversation room
    io.to(`conversation:${conversation.id}`).emit('conversation-updated', conversation);
  }
}

// Emit new conversation created
function emitNewConversation(conversation) {
  if (io) {
    io.to('conversations-list').emit('new-conversation', conversation);
    console.log(`Emitted new-conversation to conversations-list`);
  }
}

// Emit conversation deleted
function emitConversationDeleted(conversationId) {
  if (io) {
    io.to('conversations-list').emit('conversation-deleted', { id: conversationId });
  }
}

module.exports = {
  setupSocket,
  getIO,
  emitNewMessage,
  emitMessageUpdated,
  emitConversationUpdated,
  emitNewConversation,
  emitConversationDeleted
};
