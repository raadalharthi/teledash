import React, { useState, useEffect, useCallback } from 'react';
import { ConversationList } from './components/ConversationList';
import { ChatWindow } from './components/ChatWindow';
import { Settings } from './components/Settings/Settings';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';
import { Conversation, User } from './types';
import { authApi, getToken, clearToken } from './lib/api';
import { reconnectSocket, disconnectSocket } from './lib/socket';

type ViewType = 'chat' | 'settings';
type AuthView = 'login' | 'register';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [authLoading, setAuthLoading] = useState(true);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('chat');

  // Check existing token on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      authApi.getMe().then(result => {
        if (result.success && result.user) {
          setUser(result.user);
          reconnectSocket();
        } else {
          clearToken();
        }
        setAuthLoading(false);
      });
    } else {
      setAuthLoading(false);
    }
  }, []);

  const handleLogin = useCallback((u: User, _token: string) => {
    setUser(u);
    reconnectSocket();
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setUser(null);
    disconnectSocket();
    setActiveConversationId(null);
    setActiveConversation(null);
    setCurrentView('chat');
  }, []);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Show auth pages if not logged in
  if (!user) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onRegister={handleLogin}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthView('register')}
      />
    );
  }

  // Authenticated dashboard
  return <Dashboard
    user={user}
    onLogout={handleLogout}
    activeConversationId={activeConversationId}
    setActiveConversationId={setActiveConversationId}
    activeConversation={activeConversation}
    setActiveConversation={setActiveConversation}
    currentView={currentView}
    setCurrentView={setCurrentView}
  />;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  activeConversation: Conversation | null;
  setActiveConversation: (c: Conversation | null) => void;
  currentView: ViewType;
  setCurrentView: (v: ViewType) => void;
}

function Dashboard({
  user,
  onLogout,
  activeConversationId,
  setActiveConversationId,
  activeConversation,
  setActiveConversation,
  currentView,
  setCurrentView,
}: DashboardProps) {
  const {
    conversations,
    loading: conversationsLoading,
    realtimeStatus: convRealtimeStatus,
    markAsRead
  } = useConversations();

  const {
    messages,
    loading: messagesLoading,
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
  }, [activeConversationId, conversations, markAsRead, setActiveConversation]);

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
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}
            title={isConnected ? 'Connected' : 'Connecting...'}
          />

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-surface-400 hover:text-red-400 hover:bg-sidebar-hover transition-all duration-200"
            title={`Logout (${user.email})`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
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
