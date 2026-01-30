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
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getChannelColor = (channelType: string) => {
    switch (channelType) {
      case 'telegram': return 'bg-blue-500';
      case 'whatsapp': return 'bg-emerald-500';
      case 'email': return 'bg-amber-500';
      case 'sms': return 'bg-violet-500';
      default: return 'bg-surface-400';
    }
  };

  if (loading) {
    return (
      <div className="w-[360px] border-r border-surface-200 bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-surface-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[360px] border-r border-surface-200 bg-white flex flex-col flex-shrink-0">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-xl font-bold text-surface-900">Chats</h1>
        <p className="text-xs text-surface-400 mt-0.5">{conversations.length} conversations</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-5 py-16 text-center animate-fade-in">
            <div className="text-5xl mb-4 opacity-30">💬</div>
            <p className="text-base font-medium text-surface-400">No conversations yet</p>
            <p className="text-sm text-surface-300 mt-1">Send a message to your bot to start</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = activeConversationId === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-50 border-r-[3px] border-brand-500'
                    : 'hover:bg-surface-50 border-r-[3px] border-transparent'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-400 to-accent flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white shadow-sm">
                    {conv.contact?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${getChannelColor(conv.channel_type)}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-sm truncate ${isActive ? 'font-semibold text-brand-700' : 'font-medium text-surface-900'}`}>
                      {conv.contact?.name || 'Unknown'}
                    </h3>
                    <span className="text-[11px] text-surface-400 flex-shrink-0 ml-2">
                      {formatTime(conv.last_message_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] text-surface-500 truncate flex-1">
                      {conv.last_message_text || 'No messages yet'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="bg-brand-500 text-white text-[11px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 flex-shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
