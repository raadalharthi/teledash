import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Message } from '../types';
import { messagesApi } from '../lib/api';

interface MessageInputProps {
  onSendMessage: (text: string, options?: { media_type?: string; media_url?: string }) => Promise<void>;
  onSendTyping?: () => void;
  editingMessage?: Message | null;
  onEditMessage?: (messageId: string, text: string) => Promise<any>;
  onCancelEdit?: () => void;
  conversationId?: string;
  replyToMessageId?: string;
}

export function MessageInput({ onSendMessage, onSendTyping, editingMessage, onEditMessage, onCancelEdit, conversationId, replyToMessageId }: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMessage?.text) {
      setText(editingMessage.text);
    }
  }, [editingMessage]);

  // Generate preview for images
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreview(null);
    }
  }, [selectedFile]);

  const handleSend = async () => {
    if ((!text.trim() && !selectedFile) || sending) return;

    setSending(true);
    try {
      if (editingMessage && onEditMessage) {
        await onEditMessage(editingMessage.id, text.trim());
      } else if (selectedFile && conversationId) {
        // Upload file
        const result = await messagesApi.uploadFile(
          conversationId,
          selectedFile,
          text.trim() || undefined,
          replyToMessageId
        );
        if (!result.success) throw new Error(result.error);
        setSelectedFile(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return 'Photo';
    if (file.type.startsWith('video/')) return 'Video';
    if (file.type.startsWith('audio/')) return 'Audio';
    return 'File';
  };

  return (
    <div className="bg-white border-t border-surface-200 px-6 py-4">
      {/* File preview bar */}
      {selectedFile && (
        <div className="flex items-center gap-3 mb-3 p-2 bg-surface-50 rounded-lg">
          {filePreview ? (
            <img src={filePreview} alt="" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-brand-50 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900 truncate">{selectedFile.name}</p>
            <p className="text-xs text-surface-400">
              {getFileIcon(selectedFile)} · {(selectedFile.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button onClick={handleRemoveFile} className="w-7 h-7 rounded-full hover:bg-surface-200 flex items-center justify-center text-surface-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
        />

        {/* Attachment button */}
        {!editingMessage && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="
              w-11 h-11 rounded-xl bg-surface-50 border border-surface-200 text-surface-500
              flex items-center justify-center flex-shrink-0
              transition-all duration-200
              hover:bg-surface-100 hover:text-surface-700
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Attach file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
        )}

        <textarea
          value={text}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={selectedFile ? 'Add a caption...' : editingMessage ? 'Edit message...' : 'Type a message...'}
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
          disabled={(!text.trim() && !selectedFile) || sending}
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
