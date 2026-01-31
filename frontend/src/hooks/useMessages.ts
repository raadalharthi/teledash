import { useState, useEffect, useCallback, useRef } from 'react';
import { messagesApi } from '../lib/api';
import {
  joinConversation,
  leaveConversation,
  onNewMessage,
  onMessageUpdated,
  onMessageDeleted,
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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      const result = await messagesApi.getByConversation(conversationId, 100, 0);

      if (!result.success) {
        throw new Error(result.error || 'Failed to load messages');
      }

      setMessages(result.messages || []);
      setError(null);

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
      setReplyTo(null);
      setEditingMessage(null);
      setRealtimeStatus('disconnected');
      return;
    }

    loadMessages();
    joinConversation(conversationId);

    const unsubNewMessage = onNewMessage((message) => {
      if (message.conversation_id !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      setTimeout(() => {
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    });

    const unsubMessageUpdated = onMessageUpdated((message) => {
      if (message.conversation_id !== conversationId) return;
      setMessages((prev) =>
        prev.map((msg) => (msg.id === message.id ? message : msg))
      );
    });

    const unsubMessageDeleted = onMessageDeleted((data) => {
      if (data.conversation_id !== conversationId) return;
      setMessages((prev) => prev.filter((msg) => msg.id !== data.id));
    });

    const unsubConnectionChange = onConnectionChange((connected) => {
      setRealtimeStatus(connected ? 'connected' : 'disconnected');
      if (connected && conversationId) {
        joinConversation(conversationId);
      }
    });

    return () => {
      leaveConversation(conversationId);
      unsubNewMessage();
      unsubMessageUpdated();
      unsubMessageDeleted();
      unsubConnectionChange();
    };
  }, [conversationId, loadMessages]);

  const sendMessage = useCallback(
    async (text: string, options?: { media_type?: string; media_url?: string }) => {
      if (!conversationId || (!text.trim() && !options?.media_url)) return;

      try {
        const result = await messagesApi.send(conversationId, text.trim(), {
          ...options,
          reply_to_message_id: replyTo?.id,
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to send message');
        }

        setReplyTo(null);
        return result;
      } catch (err: any) {
        console.error('Error sending message:', err);
        setError(err.message);
        throw err;
      }
    },
    [conversationId, replyTo]
  );

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      try {
        const result = await messagesApi.edit(messageId, text);
        if (!result.success) throw new Error(result.error);
        setEditingMessage(null);
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    []
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const result = await messagesApi.delete(messageId);
        if (!result.success) throw new Error(result.error);
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    []
  );

  const reactToMessage = useCallback(
    async (messageId: string, emoji: string | null) => {
      try {
        const result = await messagesApi.react(messageId, emoji);
        if (!result.success) throw new Error(result.error);
        return result;
      } catch (err: any) {
        setError(err.message);
      }
    },
    []
  );

  const sendTyping = useCallback(() => {
    if (!conversationId) return;
    if (typingTimeoutRef.current) return; // Already sent recently

    messagesApi.sendTyping(conversationId);
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 3000);
  }, [conversationId]);

  return {
    messages,
    loading,
    error,
    realtimeStatus,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    sendTyping,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    refresh: loadMessages,
  };
}
