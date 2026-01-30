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
  email: '',
  password: '',
  display_name: '',
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const channel = await onGetConfig('email');
      if (channel) {
        const emailConfig = channel.config as any;
        const passwordSaved = emailConfig?.password === '********' || emailConfig?.smtp?.password === '********';
        setHasExistingPassword(passwordSaved);

        // Handle both new simplified and old SMTP format
        setConfig({
          email: emailConfig?.email || emailConfig?.smtp?.user || emailConfig?.from_email || '',
          password: '',
          display_name: emailConfig?.display_name || emailConfig?.from_name || '',
          imap: emailConfig?.imap,
          smtp: emailConfig?.smtp ? {
            host: emailConfig.smtp.host || '',
            port: emailConfig.smtp.port || 587,
            secure: emailConfig.smtp.secure || false,
          } : undefined,
        });
        setIsActive(channel.is_active);

        if (emailConfig?.imap?.host || emailConfig?.smtp?.host) {
          setShowAdvanced(true);
        }
      }
      setLoaded(true);
    };
    loadConfig();
  }, [onGetConfig]);

  const detectProvider = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) { setDetectedProvider(null); return; }

    if (domain === 'gmail.com' || domain === 'googlemail.com') setDetectedProvider('Gmail');
    else if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') setDetectedProvider('Outlook');
    else if (domain === 'yahoo.com' || domain === 'ymail.com') setDetectedProvider('Yahoo');
    else if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') setDetectedProvider('iCloud');
    else setDetectedProvider(null);
  };

  const handleTest = async () => {
    setTestResult(null);
    setErrors([]);
    if (!config.email) {
      setErrors(['Please enter your email address']);
      return;
    }

    const configToTest = {
      ...config,
      password: config.password || (hasExistingPassword ? '********' : ''),
    };
    const result = await onTest('email', configToTest);
    setTestResult(result);
  };

  const handleSave = async () => {
    setErrors([]);
    setSuccess(false);

    const configToSave = {
      ...config,
      password: config.password || (hasExistingPassword ? '********' : ''),
    };
    const result = await onSave('email', configToSave, isActive);

    if (result.success) {
      setSuccess(true);
      setHasExistingPassword(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setErrors(result.errors || ['Failed to save settings']);
    }
  };

  if (!loaded) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-sm text-surface-400">Loading Email settings...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="p-6 border-b border-surface-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Email</h2>
              <p className="text-sm text-surface-400">Send and receive emails through TeleDash</p>
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
        {/* Email Address */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Email Address</label>
          <div className="relative">
            <input
              type="email"
              value={config.email}
              onChange={(e) => {
                setConfig((prev) => ({ ...prev, email: e.target.value }));
                detectProvider(e.target.value);
              }}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-sm transition-all duration-200"
            />
            {detectedProvider && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-xs text-emerald-600 font-medium">{detectedProvider}</span>
              </div>
            )}
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">
            Password
            {hasExistingPassword && !config.password && (
              <span className="ml-2 text-emerald-600 text-xs font-normal">(Saved)</span>
            )}
          </label>
          <input
            type="password"
            value={config.password}
            onChange={(e) => setConfig((prev) => ({ ...prev, password: e.target.value }))}
            placeholder={hasExistingPassword ? 'Leave empty to keep current' : 'Enter password or app password'}
            className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-sm transition-all duration-200"
          />
          <p className="mt-1.5 text-xs text-surface-400">
            For Gmail, use an App Password from your Google Account security settings
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">
            Display Name <span className="text-surface-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={config.display_name || ''}
            onChange={(e) => setConfig((prev) => ({ ...prev, display_name: e.target.value }))}
            placeholder="TeleDash Support"
            className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-sm transition-all duration-200"
          />
        </div>

        {/* Advanced Settings Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-surface-400 hover:text-surface-600 transition-colors"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`}
          >
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          Advanced Settings
        </button>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2 border-surface-100">
            <p className="text-xs text-surface-400">
              Override auto-detected IMAP/SMTP settings. Leave empty for auto-detection.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">IMAP Host</label>
                <input
                  type="text"
                  value={config.imap?.host || ''}
                  onChange={(e) => setConfig((prev) => ({
                    ...prev,
                    imap: { host: e.target.value, port: prev.imap?.port || 993, secure: prev.imap?.secure ?? true }
                  }))}
                  placeholder="imap.gmail.com"
                  className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-xs transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">IMAP Port</label>
                <input
                  type="number"
                  value={config.imap?.port || ''}
                  onChange={(e) => setConfig((prev) => ({
                    ...prev,
                    imap: { host: prev.imap?.host || '', port: parseInt(e.target.value) || 993, secure: prev.imap?.secure ?? true }
                  }))}
                  placeholder="993"
                  className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-xs transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">SMTP Host</label>
                <input
                  type="text"
                  value={config.smtp?.host || ''}
                  onChange={(e) => setConfig((prev) => ({
                    ...prev,
                    smtp: { host: e.target.value, port: prev.smtp?.port || 587, secure: prev.smtp?.secure ?? false }
                  }))}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-xs transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">SMTP Port</label>
                <input
                  type="number"
                  value={config.smtp?.port || ''}
                  onChange={(e) => setConfig((prev) => ({
                    ...prev,
                    smtp: { host: prev.smtp?.host || '', port: parseInt(e.target.value) || 587, secure: prev.smtp?.secure ?? false }
                  }))}
                  placeholder="587"
                  className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-xs transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Test Button */}
        <div>
          <button
            onClick={handleTest}
            disabled={testing === 'email' || !config.email}
            className="px-4 py-2.5 bg-surface-100 text-surface-600 rounded-xl hover:bg-surface-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
          >
            {testing === 'email' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl text-sm ${testResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            {testResult.success ? (
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{testResult.message}</span>
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
            disabled={saving}
            className="px-6 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
