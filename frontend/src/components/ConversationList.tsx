import React from 'react';
import { Conversation } from '../types';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  loading: boolean;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading
}: ConversationListProps) {
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case 'telegram':
        return '✈️';
      case 'whatsapp':
        return '💬';
      case 'sms':
        return '📱';
      case 'email':
        return '✉️';
      default:
        return '💬';
    }
  };

  if (loading) {
    return (
      <div className="w-96 border-r border-gray-300 bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="w-96 border-r border-gray-300 bg-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-100 p-4 border-b border-gray-300">
        <h1 className="text-xl font-semibold text-gray-800">TeleDash</h1>
        <p className="text-sm text-gray-600">Unified Messaging</p>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No conversations yet</p>
            <p className="text-sm">
              Send a message to your Telegram bot to start!
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`
                flex items-start gap-3 p-4 border-b border-gray-200 cursor-pointer
                hover:bg-gray-50 transition-colors
                ${activeConversationId === conv.id ? 'bg-blue-50' : ''}
              `}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {conv.contact?.name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {conv.contact?.name || 'Unknown'}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatTime(conv.last_message_time)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm" title={conv.channel_type}>
                    {getChannelIcon(conv.channel_type)}
                  </span>
                  <p className="text-sm text-gray-600 truncate flex-1">
                    {conv.last_message_text || 'No messages yet'}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="bg-telegram-blue text-white text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
