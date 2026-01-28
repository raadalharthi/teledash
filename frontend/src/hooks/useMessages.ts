import { useState, useEffect, useCallback } from 'react';
import { messagesApi } from '../lib/api';
import {
  joinConversation,
  leaveConversation,
  onNewMessage,
  onMessageUpdated,
  onConnectionChange,
  isConnected,
} from '../lib/socket';
import { Message } from '../types';

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>(
    isConnected() ? 'connected' : 'disconnected'
  );

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      console.log('Loading messages for conversation:', conversationId);

      const result = await messagesApi.getByConversation(conversationId, 100, 0);

      if (!result.success) {
        throw new Error(result.error || 'Failed to load messages');
      }

      console.log('Loaded messages:', result.messages?.length || 0);
      setMessages(result.messages || []);
      setError(null);

      // Scroll to bottom after loading
      setTimeout(() => {
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    } catch (err: any) {
      console.error('Error loading messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setRealtimeStatus('disconnected');
      return;
    }

    // Load initial messages
    loadMessages();

    // Join conversation room for real-time updates
    joinConversation(conversationId);

    // Set up real-time event handlers
    const unsubNewMessage = onNewMessage((message) => {
      // Only add message if it belongs to this conversation
      if (message.conversation_id !== conversationId) return;

      console.log('New message received:', message);
      setMessages((prev) => {
        // Check if message already exists (avoid duplicates)
        if (prev.some((m) => m.id === message.id)) {
          console.log('Duplicate message, skipping');
          return prev;
        }
        console.log('Adding new message to state');
        return [...prev, message];
      });

      // Auto-scroll to bottom
      setTimeout(() => {
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    });

    const unsubMessageUpdated = onMessageUpdated((message) => {
      // Only update message if it belongs to this conversation
      if (message.conversation_id !== conversationId) return;

      console.log('Message updated:', message);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === message.id ? message : msg))
      );
    });

    const unsubConnectionChange = onConnectionChange((connected) => {
      setRealtimeStatus(connected ? 'connected' : 'disconnected');
      if (connected && conversationId) {
        // Rejoin room on reconnect
        joinConversation(conversationId);
      }
    });

    // Cleanup
    return () => {
      leaveConversation(conversationId);
      unsubNewMessage();
      unsubMessageUpdated();
      unsubConnectionChange();
    };
  }, [conversationId, loadMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || !text.trim()) return;

      console.log('Sending message:', text);

      try {
        const result = await messagesApi.send(conversationId, text.trim());

        if (!result.success) {
          throw new Error(result.error || 'Failed to send message');
        }

        console.log('Message sent successfully:', result);
        return result;
      } catch (err: any) {
        console.error('Error sending message:', err);
        setError(err.message);
        throw err;
      }
    },
    [conversationId]
  );

  return {
    messages,
    loading,
    error,
    realtimeStatus,
    sendMessage,
    refresh: loadMessages,
  };
}
