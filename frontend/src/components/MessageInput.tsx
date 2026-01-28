import React, { useState, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (text: string) => Promise<void>;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(text);
      setText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border-t border-gray-300 p-4">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows={1}
          disabled={sending}
          className="
            flex-1 px-4 py-3 border border-gray-300 rounded-lg
            resize-none focus:outline-none focus:border-telegram-blue
            disabled:bg-gray-100 disabled:cursor-not-allowed
            max-h-32
          "
          style={{
            minHeight: '44px',
            maxHeight: '128px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="
            px-6 py-3 bg-telegram-blue text-white rounded-lg
            font-medium transition-all
            hover:bg-blue-600 active:scale-95
            disabled:bg-gray-300 disabled:cursor-not-allowed
            disabled:active:scale-100
          "
        >
          {sending ? (
            <span className="inline-block animate-pulse">Sending...</span>
          ) : (
            <span>Send</span>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
