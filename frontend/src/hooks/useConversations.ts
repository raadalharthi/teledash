import { useState, useEffect, useCallback } from 'react';
import { conversationsApi, messagesApi } from '../lib/api';
import {
  joinConversationsList,
  leaveConversationsList,
  onNewConversation,
  onConversationUpdated,
  onConversationDeleted,
  onConnectionChange,
  isConnected,
} from '../lib/socket';
import { Conversation } from '../types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>(
    isConnected() ? 'connected' : 'connecting'
  );

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading conversations...');

      const result = await conversationsApi.getAll(false, 100);

      if (!result.success) {
        throw new Error(result.error || 'Failed to load conversations');
      }

      console.log('Loaded conversations:', result.conversations?.length || 0);
      setConversations(result.conversations || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load initial conversations
    loadConversations();

    // Join conversations list room for real-time updates
    joinConversationsList();

    // Set up real-time event handlers
    const unsubNewConversation = onNewConversation((conversation) => {
      console.log('New conversation received:', conversation);
      setConversations((prev) => {
        // Check if already exists
        if (prev.some((c) => c.id === conversation.id)) {
          return prev;
        }
        return [conversation, ...prev];
      });
    });

    const unsubConversationUpdated = onConversationUpdated((conversation) => {
      console.log('Conversation updated:', conversation);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversation.id ? { ...conv, ...conversation } : conv
        )
      );
    });

    const unsubConversationDeleted = onConversationDeleted(({ id }) => {
      console.log('Conversation deleted:', id);
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
    });

    const unsubConnectionChange = onConnectionChange((connected) => {
      setRealtimeStatus(connected ? 'connected' : 'disconnected');
      if (connected) {
        // Rejoin room on reconnect
        joinConversationsList();
      }
    });

    // Cleanup
    return () => {
      leaveConversationsList();
      unsubNewConversation();
      unsubConversationUpdated();
      unsubConversationDeleted();
      unsubConnectionChange();
    };
  }, [loadConversations]);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      const result = await messagesApi.markAsRead(conversationId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark as read');
      }

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (err: any) {
      console.error('Error marking as read:', err);
    }
  }, []);

  const archiveConversation = useCallback(async (conversationId: string) => {
    try {
      const result = await conversationsApi.archive(conversationId, true);

      if (!result.success) {
        throw new Error(result.error || 'Failed to archive conversation');
      }

      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
    } catch (err: any) {
      console.error('Error archiving conversation:', err);
    }
  }, []);

  return {
    conversations,
    loading,
    error,
    realtimeStatus,
    markAsRead,
    archiveConversation,
    refresh: loadConversations,
  };
}
