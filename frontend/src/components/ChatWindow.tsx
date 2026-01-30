import React from 'react';
import { Message, Conversation } from '../types';
import { MessageInput } from './MessageInput';

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  onSendMessage: (text: string) => Promise<void>;
}

export function ChatWindow({
  conversation,
  messages,
  loading,
  onSendMessage
}: ChatWindowProps) {
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getChannelLabel = (type: string) => {
    switch (type) {
      case 'telegram': return 'Telegram';
      case 'whatsapp': return 'WhatsApp';
      case 'email': return 'Email';
      case 'sms': return 'SMS';
      default: return type;
    }
  };

  const getChannelColor = (type: string) => {
    switch (type) {
      case 'telegram': return 'bg-blue-500';
      case 'whatsapp': return 'bg-emerald-500';
      case 'email': return 'bg-amber-500';
      case 'sms': return 'bg-violet-500';
      default: return 'bg-surface-400';
    }
  };

  const renderMediaMessage = (message: Message) => {
    if (!message.media_url) return null;

    switch (message.media_type) {
      case 'photo':
        return (
          <div className="mt-2">
            <img
              src={message.media_url}
              alt="Shared image"
              className="max-w-sm rounded-xl"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                e.currentTarget.alt = 'Image not available';
              }}
            />
          </div>
        );
      case 'document':
        return (
          <div className="mt-2 text-sm opacity-80 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            Document
          </div>
        );
      case 'voice':
        return (
          <div className="mt-2 text-sm opacity-80 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
            Voice message
          </div>
        );
      case 'sticker':
        return (
          <div className="mt-2 text-2xl">
            {message.text || '(Sticker)'}
          </div>
        );
      default:
        return null;
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-50">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center shadow-glow">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-900 mb-2">Welcome to TeleDash</h2>
          <p className="text-sm text-surface-400">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-6 py-4 flex items-center gap-4">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-accent flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white shadow-sm">
            {conversation.contact?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getChannelColor(conversation.channel_type)}`} />
        </div>
        <div>
          <h2 className="font-semibold text-surface-900 text-[15px]">
            {conversation.contact?.name || 'Unknown'}
          </h2>
          <p className="text-xs text-surface-400">
            {getChannelLabel(conversation.channel_type)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        id="chat-messages"
        className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-surface-400">Loading messages...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <p className="text-surface-400">No messages yet</p>
            <p className="text-sm text-surface-300 mt-1">Start the conversation below</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOutgoing = message.sender_type === 'admin';
            return (
              <div
                key={message.id}
                className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} animate-slide-up`}
              >
                <div
                  className={`
                    max-w-md px-4 py-2.5 shadow-message
                    ${
                      isOutgoing
                        ? 'bg-brand-500 text-white rounded-2xl rounded-br-md'
                        : 'bg-white text-surface-900 rounded-2xl rounded-bl-md border border-surface-100'
                    }
                  `}
                >
                  {message.text && (
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                      {message.text}
                    </p>
                  )}
                  {renderMediaMessage(message)}
                  <div
                    className={`
                      text-[11px] mt-1.5 flex items-center gap-1
                      ${isOutgoing ? 'text-brand-200' : 'text-surface-400'}
                    `}
                  >
                    <span>{formatMessageTime(message.created_at)}</span>
                    {isOutgoing && (
                      <span className="ml-0.5">
                        {message.status === 'sent' ? '✓' : '✓✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Input */}
      <MessageInput onSendMessage={onSendMessage} />
    </div>
  );
}
