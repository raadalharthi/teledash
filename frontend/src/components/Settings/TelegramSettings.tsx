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

  // Load existing config
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
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Loading Telegram settings...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✈️</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Telegram Bot</h2>
              <p className="text-sm text-gray-500">Connect your Telegram bot to receive messages</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-telegram-blue"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {isActive ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Bot Token Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bot Token
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Enter your Telegram bot token (e.g., 123456:ABC...)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue focus:border-transparent"
            />
            <button
              onClick={handleTest}
              disabled={testing === 'telegram' || !botToken}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing === 'telegram' ? 'Testing...' : 'Test'}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Get your bot token from{' '}
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="text-telegram-blue hover:underline"
            >
              @BotFather
            </a>{' '}
            on Telegram
          </p>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`p-4 rounded-lg ${
              testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {testResult.success ? (
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>{testResult.message}</span>
                {testResult.bot_info && (
                  <span className="font-medium ml-1">@{testResult.bot_info.username}</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-red-600">✕</span>
                <span>{testResult.error}</span>
              </div>
            )}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="p-4 rounded-lg bg-red-50 text-red-800">
            {errors.map((err, i) => (
              <p key={i} className="flex items-center gap-2">
                <span>✕</span> {err}
              </p>
            ))}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="p-4 rounded-lg bg-green-50 text-green-800 flex items-center gap-2">
            <span>✓</span> Settings saved successfully
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving || !botToken}
            className="px-6 py-2 bg-telegram-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
