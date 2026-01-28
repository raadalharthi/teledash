import React, { useState, useEffect } from 'react';
import { Channel, EmailConfig, ConnectionTestResult } from '../../types';

interface EmailSettingsProps {
  channels: Channel[];
  onSave: (type: string, config: any, isActive: boolean) => Promise<{ success: boolean; errors?: string[] }>;
  onTest: (type: string, config: any) => Promise<ConnectionTestResult>;
  onGetConfig: (type: string) => Promise<Channel | null>;
  saving: boolean;
  testing: string | null;
}

const defaultConfig: EmailConfig = {
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: ''
  },
  from_name: '',
  from_email: ''
};

export function EmailSettings({
  channels,
  onSave,
  onTest,
  onGetConfig,
  saving,
  testing
}: EmailSettingsProps) {
  const [config, setConfig] = useState<EmailConfig>(defaultConfig);
  const [isActive, setIsActive] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasExistingPassword, setHasExistingPassword] = useState(false);

  // Load existing config
  useEffect(() => {
    const loadConfig = async () => {
      const channel = await onGetConfig('email');
      if (channel) {
        const emailConfig = channel.config as EmailConfig;
        // Check if password is saved (backend masks it as '********')
        const passwordSaved = emailConfig?.smtp?.password === '********';
        setHasExistingPassword(passwordSaved);
        setConfig({
          smtp: {
            host: emailConfig?.smtp?.host || '',
            port: emailConfig?.smtp?.port || 587,
            secure: emailConfig?.smtp?.secure || false,
            user: emailConfig?.smtp?.user || '',
            password: '' // Don't show saved password
          },
          from_name: emailConfig?.from_name || '',
          from_email: emailConfig?.from_email || ''
        });
        setIsActive(channel.is_active);
      }
      setLoaded(true);
    };
    loadConfig();
  }, [onGetConfig]);

  const updateSmtp = (field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      smtp: { ...prev.smtp, [field]: value }
    }));
  };

  const handleTest = async () => {
    setTestResult(null);
    setErrors([]);

    if (!config.smtp.host || !config.smtp.user) {
      setErrors(['Please fill in SMTP host and username']);
      return;
    }

    // If password is empty but we have an existing one, send marker to use saved password
    const configToTest = {
      ...config,
      smtp: {
        ...config.smtp,
        password: config.smtp.password || (hasExistingPassword ? '********' : '')
      }
    };

    const result = await onTest('email', configToTest);
    setTestResult(result);
  };

  const handleSave = async () => {
    setErrors([]);
    setSuccess(false);

    // If password is empty but we have an existing one, send marker to keep it
    const configToSave = {
      ...config,
      smtp: {
        ...config.smtp,
        password: config.smtp.password || (hasExistingPassword ? '********' : '')
      }
    };

    const result = await onSave('email', configToSave, isActive);

    if (result.success) {
      setSuccess(true);
      setHasExistingPassword(true); // Password is now saved
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setErrors(result.errors || ['Failed to save settings']);
    }
  };

  if (!loaded) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Loading Email settings...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✉️</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Email</h2>
              <p className="text-sm text-gray-500">Send and receive emails through TeleDash</p>
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
        {/* SMTP Settings Section */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">SMTP Settings (Outgoing Mail)</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Host
              </label>
              <input
                type="text"
                value={config.smtp.host}
                onChange={(e) => updateSmtp('host', e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <select
                value={config.smtp.port}
                onChange={(e) => updateSmtp('port', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white"
              >
                <option value={587}>587 (TLS - Recommended)</option>
                <option value={465}>465 (SSL)</option>
                <option value={25}>25 (Unencrypted)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username / Email
              </label>
              <input
                type="email"
                value={config.smtp.user}
                onChange={(e) => updateSmtp('user', e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password / App Password
                {hasExistingPassword && !config.smtp.password && (
                  <span className="ml-2 text-green-600 text-xs font-normal">(Password saved)</span>
                )}
              </label>
              <input
                type="password"
                value={config.smtp.password}
                onChange={(e) => updateSmtp('password', e.target.value)}
                placeholder={hasExistingPassword ? "Leave empty to keep current password" : "Enter password"}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
              />
              <p className="mt-1 text-xs text-gray-500">
                {hasExistingPassword
                  ? "Enter a new password only if you want to change it"
                  : "For Gmail, use an App Password (not your regular password)"}
              </p>
            </div>
          </div>
        </div>

        {/* From Address Settings */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Sender Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={config.from_name}
                onChange={(e) => setConfig((prev) => ({ ...prev, from_name: e.target.value }))}
                placeholder="TeleDash Support"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email Address
              </label>
              <input
                type="email"
                value={config.from_email}
                onChange={(e) => setConfig((prev) => ({ ...prev, from_email: e.target.value }))}
                placeholder="support@yourdomain.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
              />
            </div>
          </div>
        </div>

        {/* Incoming Email Webhook Section */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-md font-medium text-gray-900 mb-2">Receiving Emails (Incoming)</h3>
          <p className="text-sm text-gray-600 mb-3">
            To receive emails in TeleDash, configure your email provider to send webhooks to:
          </p>
          <div className="bg-white rounded p-3 font-mono text-sm break-all border border-blue-200">
            {window.location.origin}/api/email/webhook
          </div>
          <div className="mt-3 text-xs text-gray-500">
            <p className="font-medium mb-1">Supported providers:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>SendGrid Inbound Parse</li>
              <li>Mailgun Routes</li>
              <li>Postmark Inbound</li>
              <li>Cloudflare Email Workers</li>
            </ul>
          </div>
        </div>

        {/* Test Button */}
        <div>
          <button
            onClick={handleTest}
            disabled={testing === 'email' || !config.smtp.host}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing === 'email' ? 'Testing...' : 'Test Connection'}
          </button>
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
            disabled={saving}
            className="px-6 py-2 bg-telegram-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
