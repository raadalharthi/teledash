import React, { useState, useEffect, useCallback } from 'react';
import { Message, Conversation, Contact } from '../types';
import { MessageInput } from './MessageInput';
import { messagesApi } from '../lib/api';

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  onSendMessage: (text: string, options?: { media_type?: string; media_url?: string }) => Promise<void>;
  onEditMessage?: (messageId: string, text: string) => Promise<any>;
  onDeleteMessage?: (messageId: string) => Promise<any>;
  onReactToMessage?: (messageId: string, emoji: string | null) => Promise<any>;
  onSendTyping?: () => void;
  replyTo?: Message | null;
  onSetReplyTo?: (message: Message | null) => void;
  editingMessage?: Message | null;
  onSetEditingMessage?: (message: Message | null) => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎'];

export function ChatWindow({
  conversation,
  messages,
  loading,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReactToMessage,
  onSendTyping,
  replyTo,
  onSetReplyTo,
  editingMessage,
  onSetEditingMessage,
}: ChatWindowProps) {
  const [contactInfo, setContactInfo] = useState<{ contact: Contact; chat_info: any } | null>(null);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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

  // Resolve Telegram file_id to download URL
  const resolveFileUrl = useCallback(async (fileId: string) => {
    if (mediaUrls[fileId]) return mediaUrls[fileId];
    if (fileId.startsWith('http')) {
      setMediaUrls(prev => ({ ...prev, [fileId]: fileId }));
      return fileId;
    }
    try {
      const result = await messagesApi.getFileUrl(fileId);
      if (result.success && result.url) {
        setMediaUrls(prev => ({ ...prev, [fileId]: result.url }));
        return result.url;
      }
    } catch (e) { /* ignore */ }
    return null;
  }, [mediaUrls]);

  // Resolve media URLs for messages with media
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.media_url && !mediaUrls[msg.media_url] && !msg.media_url.startsWith('http')) {
        resolveFileUrl(msg.media_url);
      }
    });
  }, [messages, mediaUrls, resolveFileUrl]);

  // Load contact profile
  const loadContactProfile = useCallback(async () => {
    if (!conversation?.contact_id) return;
    try {
      const result = await messagesApi.getContactProfile(conversation.contact_id);
      if (result.success) {
        setContactInfo({ contact: result.contact, chat_info: result.chat_info });
      }
    } catch (e) { /* ignore */ }
  }, [conversation?.contact_id]);

  const getMediaSrc = (fileId: string) => {
    return mediaUrls[fileId] || '';
  };

  const renderMediaMessage = (message: Message, isOutgoing: boolean) => {
    if (!message.media_url) return null;
    const src = getMediaSrc(message.media_url);

    switch (message.media_type) {
      case 'photo':
        return (
          <div className="mt-1.5 -mx-1">
            {src ? (
              <img
                src={src}
                alt="Photo"
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: 300 }}
                onClick={() => src && window.open(src, '_blank')}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-48 h-32 rounded-lg bg-surface-100 animate-pulse flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-300"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              </div>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="mt-1.5">
            {src ? (
              <video
                src={src}
                controls
                className="max-w-xs rounded-lg"
                style={{ maxHeight: 300 }}
              />
            ) : (
              <div className={`flex items-center gap-2 text-sm ${isOutgoing ? 'text-brand-200' : 'text-surface-500'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                Video {message.duration ? `(${formatDuration(message.duration)})` : ''} {formatFileSize(message.file_size)}
              </div>
            )}
          </div>
        );
      case 'document':
        return (
          <div
            className={`mt-1.5 flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
              isOutgoing ? 'bg-brand-600/30' : 'bg-surface-50'
            }`}
            onClick={() => src && window.open(src, '_blank')}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOutgoing ? 'bg-brand-400/40' : 'bg-brand-50'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isOutgoing ? 'white' : '#6366f1'} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isOutgoing ? 'text-white' : 'text-surface-900'}`}>
                {message.file_name || 'Document'}
              </p>
              <p className={`text-xs ${isOutgoing ? 'text-brand-200' : 'text-surface-400'}`}>
                {formatFileSize(message.file_size)} {message.mime_type ? `· ${message.mime_type.split('/')[1]?.toUpperCase()}` : ''}
              </p>
            </div>
          </div>
        );
      case 'voice':
        return (
          <div className="mt-1.5">
            {src ? (
              <audio src={src} controls className="max-w-full" style={{ height: 36 }} />
            ) : (
              <div className={`flex items-center gap-2 text-sm ${isOutgoing ? 'text-brand-200' : 'text-surface-500'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                Voice {message.duration ? formatDuration(message.duration) : ''}
              </div>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="mt-1.5">
            {src ? (
              <div>
                <p className={`text-xs mb-1 ${isOutgoing ? 'text-brand-200' : 'text-surface-500'}`}>
                  {message.file_name || 'Audio'} {message.duration ? `· ${formatDuration(message.duration)}` : ''}
                </p>
                <audio src={src} controls className="max-w-full" style={{ height: 36 }} />
              </div>
            ) : (
              <div className={`flex items-center gap-2 text-sm ${isOutgoing ? 'text-brand-200' : 'text-surface-500'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                {message.file_name || 'Audio'} {formatFileSize(message.file_size)}
              </div>
            )}
          </div>
        );
      case 'sticker':
        return <div className="mt-1 text-4xl">{message.text || '(Sticker)'}</div>;
      case 'video_note':
        return (
          <div className="mt-1.5">
            {src ? (
              <video src={src} controls className="w-48 h-48 rounded-full object-cover" />
            ) : (
              <div className={`flex items-center gap-2 text-sm ${isOutgoing ? 'text-brand-200' : 'text-surface-500'}`}>
                Video message {message.duration ? formatDuration(message.duration) : ''}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderReplyPreview = (replyMsg: Message['reply_to_message']) => {
    if (!replyMsg) return null;
    return (
      <div className="border-l-2 border-brand-400 pl-2 mb-1 text-xs opacity-75">
        <span className="font-medium">{replyMsg.sender_type === 'admin' ? 'You' : 'User'}</span>
        <p className="truncate">{replyMsg.text || (replyMsg.media_type ? `(${replyMsg.media_type})` : '')}</p>
      </div>
    );
  };

  const renderReactions = (message: Message) => {
    if (!message.reactions?.length) return null;
    return (
      <div className="flex gap-0.5 mt-1">
        {message.reactions.map((r, i) => (
          <span key={i} className="text-xs bg-surface-100 rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-surface-200"
            onClick={() => onReactToMessage?.(message.id, null)}>
            {r.emoji}
          </span>
        ))}
      </div>
    );
  };

  const renderInlineKeyboard = (message: Message) => {
    if (!message.reply_markup?.inline_keyboard) return null;
    return (
      <div className="mt-2 space-y-1">
        {message.reply_markup.inline_keyboard.map((row: any[], rowIdx: number) => (
          <div key={rowIdx} className="flex gap-1">
            {row.map((btn: any, btnIdx: number) => (
              <button
                key={btnIdx}
                className="flex-1 text-xs px-2 py-1.5 rounded bg-surface-100 hover:bg-surface-200 text-brand-600 font-medium transition-colors"
                onClick={() => btn.url && window.open(btn.url, '_blank')}
              >
                {btn.text}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
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
          <p className="text-sm text-surface-400">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-surface-50">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-surface-200 px-6 py-4 flex items-center gap-4">
          <div className="relative cursor-pointer" onClick={() => {
            setShowContactPanel(!showContactPanel);
            if (!contactInfo) loadContactProfile();
          }}>
            {contactInfo?.contact?.avatar_url ? (
              <img src={contactInfo.contact.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-accent flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white shadow-sm">
                {conversation.contact?.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getChannelColor(conversation.channel_type)}`} />
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => {
            setShowContactPanel(!showContactPanel);
            if (!contactInfo) loadContactProfile();
          }}>
            <h2 className="font-semibold text-surface-900 text-[15px]">
              {conversation.contact?.name || 'Unknown'}
            </h2>
            <p className="text-xs text-surface-400">
              {getChannelLabel(conversation.channel_type)}
              {conversation.contact?.username ? ` · @${conversation.contact.username}` : ''}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div id="chat-messages" className="flex-1 overflow-y-auto px-6 py-4 space-y-3" onClick={() => {
          setActiveMessageMenu(null);
          setShowReactionPicker(null);
        }}>
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
                <div key={message.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} animate-slide-up group`}>
                  <div className="relative max-w-md">
                    {/* Message actions (on hover) */}
                    <div className={`absolute top-0 ${isOutgoing ? '-left-20' : '-right-20'} hidden group-hover:flex items-center gap-0.5 z-10`}>
                      {/* Reply */}
                      <button
                        className="w-7 h-7 rounded-full bg-white shadow-sm border border-surface-200 flex items-center justify-center hover:bg-surface-50 text-surface-400 hover:text-surface-600"
                        onClick={(e) => { e.stopPropagation(); onSetReplyTo?.(message); }}
                        title="Reply"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                      </button>
                      {/* React */}
                      <button
                        className="w-7 h-7 rounded-full bg-white shadow-sm border border-surface-200 flex items-center justify-center hover:bg-surface-50 text-surface-400 hover:text-surface-600"
                        onClick={(e) => { e.stopPropagation(); setShowReactionPicker(showReactionPicker === message.id ? null : message.id); }}
                        title="React"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                      </button>
                      {/* Edit/Delete for own messages */}
                      {isOutgoing && (
                        <button
                          className="w-7 h-7 rounded-full bg-white shadow-sm border border-surface-200 flex items-center justify-center hover:bg-surface-50 text-surface-400 hover:text-surface-600"
                          onClick={(e) => { e.stopPropagation(); setActiveMessageMenu(activeMessageMenu === message.id ? null : message.id); }}
                          title="More"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                        </button>
                      )}
                    </div>

                    {/* Reaction picker */}
                    {showReactionPicker === message.id && (
                      <div className={`absolute -top-10 ${isOutgoing ? 'right-0' : 'left-0'} bg-white rounded-full shadow-lg border border-surface-200 px-2 py-1 flex gap-1 z-20`}
                        onClick={(e) => e.stopPropagation()}>
                        {REACTION_EMOJIS.map(emoji => (
                          <button key={emoji} className="w-7 h-7 rounded-full hover:bg-surface-100 flex items-center justify-center text-base transition-transform hover:scale-125"
                            onClick={() => { onReactToMessage?.(message.id, emoji); setShowReactionPicker(null); }}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Context menu for own messages */}
                    {activeMessageMenu === message.id && isOutgoing && (
                      <div className={`absolute top-0 ${isOutgoing ? '-left-28' : '-right-28'} bg-white rounded-xl shadow-lg border border-surface-200 py-1 z-20 w-24`}
                        onClick={(e) => e.stopPropagation()}>
                        {message.text && (
                          <button className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-50 text-surface-700"
                            onClick={() => { onSetEditingMessage?.(message); setActiveMessageMenu(null); }}>
                            Edit
                          </button>
                        )}
                        <button className="w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 text-red-600"
                          onClick={() => { if (window.confirm('Delete this message?')) { onDeleteMessage?.(message.id); } setActiveMessageMenu(null); }}>
                          Delete
                        </button>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className={`
                      px-4 py-2.5 shadow-message
                      ${isOutgoing
                        ? 'bg-brand-500 text-white rounded-2xl rounded-br-md'
                        : 'bg-white text-surface-900 rounded-2xl rounded-bl-md border border-surface-100'
                      }
                    `}>
                      {/* Reply preview */}
                      {message.reply_to_message && renderReplyPreview(message.reply_to_message)}

                      {/* Text */}
                      {message.text && message.media_type !== 'sticker' && (
                        <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                          {message.text}
                        </p>
                      )}

                      {/* Media */}
                      {renderMediaMessage(message, isOutgoing)}

                      {/* Inline keyboard */}
                      {renderInlineKeyboard(message)}

                      {/* Reactions */}
                      {renderReactions(message)}

                      {/* Timestamp + status */}
                      <div className={`text-[11px] mt-1.5 flex items-center gap-1 ${isOutgoing ? 'text-brand-200' : 'text-surface-400'}`}>
                        <span>{formatMessageTime(message.created_at)}</span>
                        {message.is_edited && <span className="italic">edited</span>}
                        {isOutgoing && (
                          <span className="ml-0.5">
                            {message.status === 'sent' ? '✓' : '✓✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply/Edit bar */}
        {(replyTo || editingMessage) && (
          <div className="bg-white border-t border-surface-200 px-6 py-2 flex items-center gap-3">
            <div className="flex-1 border-l-2 border-brand-500 pl-3">
              <p className="text-xs font-medium text-brand-600">
                {editingMessage ? 'Editing message' : `Replying to ${replyTo?.sender_type === 'admin' ? 'yourself' : conversation?.contact?.name || 'user'}`}
              </p>
              <p className="text-xs text-surface-500 truncate">
                {(editingMessage || replyTo)?.text || `(${(editingMessage || replyTo)?.media_type})`}
              </p>
            </div>
            <button
              className="w-6 h-6 rounded-full hover:bg-surface-100 flex items-center justify-center text-surface-400"
              onClick={() => { onSetReplyTo?.(null); onSetEditingMessage?.(null); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* Message Input */}
        <MessageInput
          onSendMessage={onSendMessage}
          onSendTyping={onSendTyping}
          editingMessage={editingMessage}
          onEditMessage={onEditMessage}
          onCancelEdit={() => onSetEditingMessage?.(null)}
          conversationId={conversation?.id}
          replyToMessageId={replyTo?.id}
        />
      </div>

      {/* Contact info panel */}
      {showContactPanel && (
        <div className="w-80 border-l border-surface-200 bg-white overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-surface-900">Contact Info</h3>
              <button className="w-7 h-7 rounded-full hover:bg-surface-100 flex items-center justify-center text-surface-400"
                onClick={() => setShowContactPanel(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              {contactInfo?.contact?.avatar_url ? (
                <img src={contactInfo.contact.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover mb-3" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-400 to-accent flex items-center justify-center text-white text-2xl font-semibold mb-3">
                  {conversation.contact?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <h4 className="font-semibold text-surface-900 text-lg">{conversation.contact?.name || 'Unknown'}</h4>
              {contactInfo?.chat_info?.username && (
                <p className="text-sm text-surface-400">@{contactInfo.chat_info.username}</p>
              )}
            </div>

            {/* Bio */}
            {contactInfo?.chat_info?.bio && (
              <div className="mb-4">
                <p className="text-xs font-medium text-surface-400 uppercase mb-1">Bio</p>
                <p className="text-sm text-surface-700">{contactInfo.chat_info.bio}</p>
              </div>
            )}

            {/* Contact details */}
            <div className="space-y-3">
              {conversation.contact?.telegram_id && (
                <div>
                  <p className="text-xs font-medium text-surface-400 uppercase mb-1">Telegram ID</p>
                  <p className="text-sm text-surface-700">{conversation.contact.telegram_id}</p>
                </div>
              )}
              {conversation.contact?.email && (
                <div>
                  <p className="text-xs font-medium text-surface-400 uppercase mb-1">Email</p>
                  <p className="text-sm text-surface-700">{conversation.contact.email}</p>
                </div>
              )}
              {conversation.contact?.phone && (
                <div>
                  <p className="text-xs font-medium text-surface-400 uppercase mb-1">Phone</p>
                  <p className="text-sm text-surface-700">{conversation.contact.phone}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-surface-400 uppercase mb-1">Channel</p>
                <p className="text-sm text-surface-700">{getChannelLabel(conversation.channel_type)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
