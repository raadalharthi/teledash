import React, { useState, useEffect, useCallback } from 'react';
import { Channel, ConnectionTestResult } from '../../types';
import { getSocket } from '../../lib/socket';

interface WhatsAppConfig {
  evolution_api_url: string;
  api_key: string;
  instance_name: string;
  connected?: boolean;
}

interface WhatsAppSettingsProps {
  channels: Channel[];
  onSave: (type: string, config: any, isActive: boolean) => Promise<{ success: boolean; errors?: string[] }>;
  onTest: (type: string, config: any) => Promise<ConnectionTestResult>;
  onGetConfig: (type: string) => Promise<Channel | null>;
  saving: boolean;
  testing: string | null;
}

export function WhatsAppSettings({
  onSave,
  onTest,
  onGetConfig,
  saving,
  testing
}: WhatsAppSettingsProps) {
  const [evolutionApiUrl, setEvolutionApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [loadingQR, setLoadingQR] = useState(false);

  // Load existing config
  useEffect(() => {
    const loadConfig = async () => {
      const channel = await onGetConfig('whatsapp');
      if (channel) {
        const config = channel.config as WhatsAppConfig;
        setEvolutionApiUrl(config?.evolution_api_url || '');
        setApiKey(config?.api_key || '');
        setInstanceName(config?.instance_name || '');
        setIsActive(channel.is_active);
        if (config?.connected) {
          setConnectionState('open');
        }
      }
      setLoaded(true);
    };
    loadConfig();
  }, [onGetConfig]);

  // Socket listeners for real-time QR code and connection updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleQRCode = (data: { qrcode?: string; base64?: string }) => {
      const qr = data.qrcode || data.base64;
      if (qr) {
        setQrCode(qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`);
        setLoadingQR(false);
      }
    };

    const handleConnection = (data: { state: string; connected?: boolean }) => {
      setConnectionState(data.state);
      if (data.state === 'open') {
        setQrCode(null);
      }
    };

    socket.on('whatsapp-qrcode', handleQRCode);
    socket.on('whatsapp-connection', handleConnection);

    return () => {
      socket.off('whatsapp-qrcode', handleQRCode);
      socket.off('whatsapp-connection', handleConnection);
    };
  }, []);

  const handleTest = async () => {
    setTestResult(null);
    setErrors([]);

    if (!evolutionApiUrl || !instanceName) {
      setErrors(['Evolution API URL and Instance Name are required']);
      return;
    }

    const result = await onTest('whatsapp', {
      evolution_api_url: evolutionApiUrl,
      api_key: apiKey,
      instance_name: instanceName
    });

    setTestResult(result);
    if (result.success && (result as any).state) {
      setConnectionState((result as any).state);
    }
  };

  const handleSave = async () => {
    setErrors([]);
    setSuccess(false);

    const result = await onSave('whatsapp', {
      evolution_api_url: evolutionApiUrl,
      api_key: apiKey,
      instance_name: instanceName
    }, isActive);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setErrors(result.errors || ['Failed to save settings']);
    }
  };

  const fetchQRCode = useCallback(async () => {
    if (!evolutionApiUrl || !apiKey || !instanceName) {
      setErrors(['Please save your configuration first']);
      return;
    }

    setLoadingQR(true);
    setQrCode(null);

    try {
      const token = localStorage.getItem('teledash_token');
      const response = await fetch('/api/channels/whatsapp/qrcode', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success && (data.qrcode || data.base64)) {
        const qr = data.qrcode || data.base64;
        setQrCode(qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`);
      } else if (data.error) {
        setErrors([data.error]);
      }
    } catch (error) {
      setErrors(['Failed to fetch QR code']);
    } finally {
      setLoadingQR(false);
    }
  }, [evolutionApiUrl, apiKey, instanceName]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('teledash_token');
      await fetch('/api/channels/whatsapp/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setConnectionState('close');
      setQrCode(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!loaded) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-sm text-surface-400">Loading WhatsApp settings...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-surface-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-surface-900">WhatsApp</h2>
              <p className="text-sm text-surface-400">Connect via Evolution API</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection status indicator */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              connectionState === 'open' ? 'bg-emerald-100 text-emerald-700' :
              connectionState === 'connecting' ? 'bg-amber-100 text-amber-700' :
              'bg-surface-100 text-surface-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                connectionState === 'open' ? 'bg-emerald-500' :
                connectionState === 'connecting' ? 'bg-amber-500 animate-pulse' :
                'bg-surface-400'
              }`} />
              {connectionState === 'open' ? 'Connected' :
               connectionState === 'connecting' ? 'Connecting...' :
               'Disconnected'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Evolution API URL */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Evolution API URL</label>
          <input
            type="text"
            value={evolutionApiUrl}
            onChange={(e) => setEvolutionApiUrl(e.target.value)}
            placeholder="https://your-evolution-api.com"
            className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-sm"
          />
          <p className="mt-1 text-xs text-surface-400">The base URL of your Evolution API instance</p>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your Evolution API key"
            className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-sm"
          />
          {apiKey && apiKey.startsWith('***') && (
            <p className="mt-1 text-xs text-emerald-600">API key saved</p>
          )}
        </div>

        {/* Instance Name */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Instance Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="my-whatsapp-instance"
              className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-sm"
            />
            <button
              onClick={handleTest}
              disabled={testing === 'whatsapp' || !evolutionApiUrl || !instanceName}
              className="px-4 py-2.5 bg-surface-100 text-surface-600 rounded-xl hover:bg-surface-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              {testing === 'whatsapp' ? 'Testing...' : 'Test'}
            </button>
          </div>
          <p className="mt-1 text-xs text-surface-400">Unique name for your WhatsApp instance in Evolution API</p>
        </div>

        {/* QR Code Section */}
        {connectionState !== 'open' && (
          <div className="bg-surface-50 rounded-xl p-6 text-center">
            <h3 className="text-sm font-medium text-surface-700 mb-4">Scan QR Code to Connect</h3>
            {qrCode ? (
              <div className="inline-block p-4 bg-white rounded-xl shadow-sm">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
              </div>
            ) : (
              <button
                onClick={fetchQRCode}
                disabled={loadingQR || !evolutionApiUrl || !apiKey || !instanceName}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                {loadingQR ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Loading...
                  </span>
                ) : 'Get QR Code'}
              </button>
            )}
            <p className="mt-4 text-xs text-surface-400">
              Open WhatsApp on your phone &rarr; Settings &rarr; Linked Devices &rarr; Link a Device
            </p>
            {qrCode && (
              <button
                onClick={fetchQRCode}
                className="mt-3 text-xs text-brand-500 hover:text-brand-600"
              >
                Refresh QR Code
              </button>
            )}
          </div>
        )}

        {/* Connected State - Show Logout Button */}
        {connectionState === 'open' && (
          <div className="bg-emerald-50 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-emerald-700 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="font-medium">WhatsApp Connected</span>
            </div>
            <p className="text-sm text-emerald-600 mb-4">Your WhatsApp is connected and ready to receive messages.</p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white text-surface-600 border border-surface-200 rounded-xl hover:bg-surface-50 transition-all text-sm font-medium"
            >
              Disconnect
            </button>
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div className={`p-4 rounded-xl text-sm ${testResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            {testResult.success ? (
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{testResult.message}</span>
                {(testResult as any).state && (
                  <span className="ml-2 text-xs opacity-75">({(testResult as any).state})</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>{testResult.error}</span>
              </div>
            )}
          </div>
        )}

        {/* Errors */}
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

        {/* Success */}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Settings saved successfully
          </div>
        )}

        {/* Webhook Info */}
        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Webhook Configuration</h4>
          <p className="text-xs text-blue-700 mb-2">
            Configure your Evolution API webhook to point to:
          </p>
          <code className="block bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-xs break-all">
            {window.location.origin}/api/whatsapp/webhook
          </code>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-surface-100">
          <button
            onClick={handleSave}
            disabled={saving || !evolutionApiUrl || !instanceName}
            className="px-6 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm hover:shadow-md"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
