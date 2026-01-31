import React, { useState, useEffect, KeyboardEvent } from 'react';
import { Message } from '../types';

interface MessageInputProps {
  onSendMessage: (text: string, options?: { media_type?: string; media_url?: string }) => Promise<void>;
  onSendTyping?: () => void;
  editingMessage?: Message | null;
  onEditMessage?: (messageId: string, text: string) => Promise<any>;
  onCancelEdit?: () => void;
}

export function MessageInput({ onSendMessage, onSendTyping, editingMessage, onEditMessage, onCancelEdit }: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (editingMessage?.text) {
      setText(editingMessage.text);
    }
  }, [editingMessage]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      if (editingMessage && onEditMessage) {
        await onEditMessage(editingMessage.id, text.trim());
      } else {
        await onSendMessage(text);
      }
      setText('');
    } catch (error) {
      console.error('Failed to send message:', error);
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onSendTyping?.();
  };

  const handleCancelEdit = () => {
    setText('');
    onCancelEdit?.();
  };

  return (
    <div className="bg-white border-t border-surface-200 px-6 py-4">
      <div className="flex items-end gap-3">
        <textarea
          value={text}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
          rows={1}
          disabled={sending}
          className="
            flex-1 px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl
            resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400
            disabled:bg-surface-100 disabled:cursor-not-allowed
            text-surface-900 placeholder-surface-400 text-[14px]
            transition-all duration-200
          "
          style={{ minHeight: '44px', maxHeight: '128px' }}
        />
        {editingMessage && (
          <button
            onClick={handleCancelEdit}
            className="
              w-11 h-11 rounded-xl bg-surface-100 text-surface-500
              flex items-center justify-center
              transition-all duration-200 hover:bg-surface-200
              flex-shrink-0
            "
            title="Cancel edit"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="
            w-11 h-11 rounded-xl bg-brand-500 text-white
            flex items-center justify-center
            transition-all duration-200
            hover:bg-brand-600 active:scale-95
            disabled:bg-surface-200 disabled:cursor-not-allowed
            disabled:active:scale-100 flex-shrink-0
            shadow-sm hover:shadow-md
          "
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : editingMessage ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
