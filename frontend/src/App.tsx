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

  // Update active conversation when it changes
  useEffect(() => {
    if (activeConversationId) {
      const conv = conversations.find((c) => c.id === activeConversationId);
      setActiveConversation(conv || null);

      // Mark as read when conversation is opened
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

  // Determine overall connection status
  const isConnected = convRealtimeStatus === 'SUBSCRIBED';
  const statusColor = isConnected ? 'bg-green-500' : 'bg-yellow-500';
  const statusText = isConnected ? 'Connected' : 'Connecting...';

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header with Navigation */}
      <div className="bg-telegram-blue text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-semibold">TeleDash</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('chat')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentView === 'chat'
                  ? 'bg-white text-telegram-blue'
                  : 'bg-telegram-blue hover:bg-blue-600 text-white border border-white/30'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentView === 'settings'
                  ? 'bg-white text-telegram-blue'
                  : 'bg-telegram-blue hover:bg-blue-600 text-white border border-white/30'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Connection Status - Only show on chat view */}
        {currentView === 'chat' && (
          <div className={`${statusColor} text-white text-center py-1 text-sm flex items-center justify-center gap-2`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white' : 'bg-white animate-pulse'}`}></span>
            <span>
              {statusText}
              {!isConnected && ' - Real-time updates may be delayed'}
            </span>
            {isConnected && activeConversationId && msgRealtimeStatus === 'SUBSCRIBED' && (
              <span className="text-green-100 text-xs ml-2">(Messages: Live)</span>
            )}
          </div>
        )}
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
