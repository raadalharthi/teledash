// Socket.io Client for TeleDash
// Replaces Supabase Realtime

import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: getToken(),
      },
    });

    socket.on('connect', () => {
      console.log('Socket.io connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function reconnectSocket(): void {
  disconnectSocket();
  getSocket();
}

// Conversation room management
export function joinConversation(conversationId: string): void {
  const s = getSocket();
  s.emit('join-conversation', conversationId);
  console.log('Joined conversation room:', conversationId);
}

export function leaveConversation(conversationId: string): void {
  const s = getSocket();
  s.emit('leave-conversation', conversationId);
  console.log('Left conversation room:', conversationId);
}

// Conversations list subscription
export function joinConversationsList(): void {
  const s = getSocket();
  s.emit('join-conversations-list');
  console.log('Joined conversations list room');
}

export function leaveConversationsList(): void {
  const s = getSocket();
  s.emit('leave-conversations-list');
  console.log('Left conversations list room');
}

// Event listeners
export type MessageHandler = (message: any) => void;
export type ConversationHandler = (conversation: any) => void;

export function onNewMessage(handler: MessageHandler): () => void {
  const s = getSocket();
  s.on('new-message', handler);
  return () => s.off('new-message', handler);
}

export function onMessageUpdated(handler: MessageHandler): () => void {
  const s = getSocket();
  s.on('message-updated', handler);
  return () => s.off('message-updated', handler);
}

export function onConversationUpdated(handler: ConversationHandler): () => void {
  const s = getSocket();
  s.on('conversation-updated', handler);
  return () => s.off('conversation-updated', handler);
}

export function onNewConversation(handler: ConversationHandler): () => void {
  const s = getSocket();
  s.on('new-conversation', handler);
  return () => s.off('new-conversation', handler);
}

export function onConversationDeleted(handler: (data: { id: string }) => void): () => void {
  const s = getSocket();
  s.on('conversation-deleted', handler);
  return () => s.off('conversation-deleted', handler);
}

// Connection status
export function isConnected(): boolean {
  return socket?.connected ?? false;
}

export function onConnectionChange(handler: (connected: boolean) => void): () => void {
  const s = getSocket();

  const connectHandler = () => handler(true);
  const disconnectHandler = () => handler(false);

  s.on('connect', connectHandler);
  s.on('disconnect', disconnectHandler);

  return () => {
    s.off('connect', connectHandler);
    s.off('disconnect', disconnectHandler);
  };
}

export { socket };
