import React, { useState, useEffect } from 'react';
import { ConversationList } from './components/ConversationList';
import { ChatWindow } from './components/ChatWindow';
import { Settings } from './components/Settings/Settings';
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';
import { Conversation } from './types';

type ViewType = 'chat' | 'settings';

function App() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('chat');

  const {
    conversations,
    loading: conversationsLoading,
    realtimeStatus: convRealtimeStatus,
    markAsRead
  } = useConversations();

  const {
    messages,
    loading: messagesLoading,
    realtimeStatus: msgRealtimeStatus,
    sendMessage
  } = useMessages(activeConversationId);

  useEffect(() => {
    if (activeConversationId) {
      const conv = conversations.find((c) => c.id === activeConversationId);
      setActiveConversation(conv || null);
      if (conv && conv.unread_count > 0) {
        markAsRead(activeConversationId);
      }
    } else {
      setActiveConversation(null);
    }
  }, [activeConversationId, conversations, markAsRead]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleSendMessage = async (text: string) => {
    await sendMessage(text);
  };

  const isConnected = convRealtimeStatus === 'connected';

  return (
    <div className="h-screen flex bg-surface-50">
      {/* Dark Sidebar Rail */}
      <div className="w-16 bg-sidebar flex flex-col items-center py-5 gap-1 flex-shrink-0">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center text-white font-bold text-lg mb-4 shadow-glow">
          T
        </div>

        {/* Nav Icons */}
        <button
          onClick={() => setCurrentView('chat')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            currentView === 'chat'
              ? 'bg-brand-500 text-white shadow-glow'
              : 'text-surface-400 hover:text-white hover:bg-sidebar-hover'
          }`}
          title="Chats"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>

        <button
          onClick={() => setCurrentView('settings')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            currentView === 'settings'
              ? 'bg-brand-500 text-white shadow-glow'
              : 'text-surface-400 hover:text-white hover:bg-sidebar-hover'
          }`}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Connection Status */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}
            title={isConnected ? 'Connected' : 'Connecting...'}
          />
        </div>
      </div>

      {/* Main Content */}
      {currentView === 'chat' ? (
        <div className="flex-1 flex overflow-hidden">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            loading={conversationsLoading}
          />
          <ChatWindow
            conversation={activeConversation}
            messages={messages}
            loading={messagesLoading}
            onSendMessage={handleSendMessage}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <Settings />
        </div>
      )}
    </div>
  );
}

export default App;
