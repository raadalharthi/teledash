import React, { useState, useEffect } from 'react';
import { Channel, TelegramConfig, ConnectionTestResult } from '../../types';

interface TelegramSettingsProps {
  channels: Channel[];
  onSave: (type: string, config: any, isActive: boolean) => Promise<{ success: boolean; errors?: string[] }>;
  onTest: (type: string, config: any) => Promise<ConnectionTestResult>;
  onGetConfig: (type: string) => Promise<Channel | null>;
  saving: boolean;
  testing: string | null;
}

export function TelegramSettings({
  channels,
  onSave,
  onTest,
  onGetConfig,
  saving,
  testing
}: TelegramSettingsProps) {
  const [botToken, setBotToken] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const channel = await onGetConfig('telegram');
      if (channel) {
        const config = channel.config as TelegramConfig;
        setBotToken(config?.bot_token || '');
        setIsActive(channel.is_active);
      }
      setLoaded(true);
    };
    loadConfig();
  }, [onGetConfig]);

  const handleTest = async () => {
    setTestResult(null);
    setErrors([]);
    if (!botToken || botToken.startsWith('***')) {
      setErrors(['Please enter a valid bot token']);
      return;
    }
    const result = await onTest('telegram', { bot_token: botToken });
    setTestResult(result);
  };

  const handleSave = async () => {
    setErrors([]);
    setSuccess(false);
    const result = await onSave('telegram', { bot_token: botToken }, isActive);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setErrors(result.errors || ['Failed to save settings']);
    }
  };

  if (!loaded) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-sm text-surface-400">Loading Telegram settings...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="p-6 border-b border-surface-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Telegram Bot</h2>
              <p className="text-sm text-surface-400">Connect your Telegram bot to receive messages</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            <span className="ml-3 text-sm font-medium text-surface-500">
              {isActive ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Bot Token</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Enter your Telegram bot token (e.g., 123456:ABC...)"
              className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-sm transition-all duration-200"
            />
            <button
              onClick={handleTest}
              disabled={testing === 'telegram' || !botToken}
              className="px-4 py-2.5 bg-surface-100 text-surface-600 rounded-xl hover:bg-surface-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
            >
              {testing === 'telegram' ? 'Testing...' : 'Test'}
            </button>
          </div>
          <p className="mt-2 text-xs text-surface-400">
            Get your bot token from{' '}
            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
              @BotFather
            </a>{' '}
            on Telegram
          </p>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl text-sm ${testResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            {testResult.success ? (
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{testResult.message}</span>
                {testResult.bot_info && <span className="font-medium ml-1">@{testResult.bot_info.username}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>{testResult.error}</span>
              </div>
            )}
          </div>
        )}

        {errors.length > 0 && (
          <div className="p-4 rounded-xl bg-red-50 text-red-800 text-sm">
            {errors.map((err, i) => (
              <p key={i} className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                {err}
              </p>
            ))}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Settings saved successfully
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-surface-100">
          <button
            onClick={handleSave}
            disabled={saving || !botToken}
            className="px-6 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
