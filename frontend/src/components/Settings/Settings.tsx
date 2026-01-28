import React, { useState } from 'react';
import { TelegramSettings } from './TelegramSettings';
import { EmailSettings } from './EmailSettings';
import { GeneralSettings } from './GeneralSettings';
import { useSettings } from '../../hooks/useSettings';

type SettingsTab = 'general' | 'telegram' | 'email';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const settings = useSettings();

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'telegram', label: 'Telegram', icon: '✈️' },
    { id: 'email', label: 'Email', icon: '✉️' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your communication channels</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-telegram-blue text-telegram-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {settings.loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Loading settings...
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
