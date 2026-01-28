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

  const renderMediaMessage = (message: Message) => {
    if (!message.media_url) return null;

    switch (message.media_type) {
      case 'photo':
        return (
          <div className="mt-2">
            <img
              src={message.media_url}
              alt="Shared image"
              className="max-w-sm rounded-lg"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                e.currentTarget.alt = 'Image not available';
              }}
            />
          </div>
        );
      case 'document':
        return (
          <div className="mt-2 text-sm text-blue-600">
            📎 Document
          </div>
        );
      case 'voice':
        return (
          <div className="mt-2 text-sm text-blue-600">
            🎤 Voice message
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
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-semibold mb-2">Welcome to TeleDash</h2>
          <p className="text-sm">
            Select a conversation from the sidebar to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
          {conversation.contact?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">
            {conversation.contact?.name || 'Unknown'}
          </h2>
          <p className="text-xs text-gray-600 capitalize">
            {conversation.channel_type}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        id="chat-messages"
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{
          backgroundImage: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)'
        }}
      >
        {loading ? (
          <div className="text-center text-gray-500 py-8">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
            <p className="text-sm mt-2">Start the conversation below!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOutgoing = message.sender_type === 'admin';
            return (
              <div
                key={message.id}
                className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-md px-4 py-2 rounded-lg shadow-sm
                    ${
                      isOutgoing
                        ? 'bg-telegram-blue text-white rounded-br-none'
                        : 'bg-white text-gray-900 rounded-bl-none'
                    }
                  `}
                >
                  {message.text && (
                    <p className="whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                  )}
                  {renderMediaMessage(message)}
                  <div
                    className={`
                      text-xs mt-1 flex items-center gap-1
                      ${isOutgoing ? 'text-blue-100' : 'text-gray-500'}
                    `}
                  >
                    <span>{formatMessageTime(message.created_at)}</span>
                    {isOutgoing && (
                      <span>
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
