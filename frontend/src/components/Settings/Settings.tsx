import React, { useState } from 'react';
import { TelegramSettings } from './TelegramSettings';
import { EmailSettings } from './EmailSettings';
import { GeneralSettings } from './GeneralSettings';
import { useSettings } from '../../hooks/useSettings';

type SettingsTab = 'general' | 'telegram' | 'email';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const settings = useSettings();

  const tabs: { id: SettingsTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      )
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      )
    },
    {
      id: 'email',
      label: 'Email',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
        </svg>
      )
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-8 pt-8 pb-0">
        <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
        <p className="text-sm text-surface-400 mt-1 mb-6">Configure your communication channels</p>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-surface-50 text-brand-600 border-t-2 border-x border-brand-500 border-x-surface-200 -mb-px'
                  : 'text-surface-400 hover:text-surface-600 hover:bg-surface-50/50'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          {settings.loading ? (
            <div className="bg-white rounded-xl shadow-card p-8 text-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span className="text-sm text-surface-400">Loading settings...</span>
            </div>
          ) : (
            <>
              {activeTab === 'general' && <GeneralSettings />}
              {activeTab === 'telegram' && (
                <TelegramSettings
                  channels={settings.channels}
                  onSave={settings.saveChannelConfig}
                  onTest={settings.testConnection}
                  onGetConfig={settings.getChannelConfig}
                  saving={settings.saving}
                  testing={settings.testing}
                />
              )}
              {activeTab === 'email' && (
                <EmailSettings
                  channels={settings.channels}
                  onSave={settings.saveChannelConfig}
                  onTest={settings.testConnection}
                  onGetConfig={settings.getChannelConfig}
                  saving={settings.saving}
                  testing={settings.testing}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
