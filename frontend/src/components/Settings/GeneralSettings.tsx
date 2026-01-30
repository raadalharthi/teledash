import React, { useState, useEffect } from 'react';

const TIMEZONES = [
  { value: 'auto', label: 'Auto-detect (Browser timezone)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time (Brazil)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris, Berlin, Rome (CET)' },
  { value: 'Europe/Moscow', label: 'Moscow Time' },
  { value: 'Asia/Dubai', label: 'Dubai, Abu Dhabi (Gulf)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
  { value: 'Asia/Bangkok', label: 'Bangkok, Jakarta (ICT)' },
  { value: 'Asia/Singapore', label: 'Singapore, Malaysia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong, China' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Japan' },
  { value: 'Asia/Seoul', label: 'Seoul, Korea' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland, New Zealand' },
  { value: 'Africa/Cairo', label: 'Cairo, Egypt' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg, South Africa' },
];

const STORAGE_KEY = 'teledash_settings';

interface GeneralSettingsData {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
}

const defaultSettings: GeneralSettingsData = {
  timezone: 'auto',
  dateFormat: 'MMM D, YYYY',
  timeFormat: '12h',
};

export function GeneralSettings() {
  const [settings, setSettings] = useState<GeneralSettingsData>(defaultSettings);
  const [success, setSuccess] = useState(false);
  const [detectedTimezone, setDetectedTimezone] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetectedTimezone(tz);
    } catch (e) {
      setDetectedTimezone('Unknown');
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      window.dispatchEvent(new CustomEvent('teledash-settings-changed', { detail: settings }));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  };

  const getCurrentTime = () => {
    const tz = settings.timezone === 'auto' ? detectedTimezone : settings.timezone;
    try {
      return new Date().toLocaleString('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: settings.timeFormat === '12h',
      });
    } catch (e) {
      return 'Invalid timezone';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="p-6 border-b border-surface-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-surface-900">General Settings</h2>
            <p className="text-sm text-surface-400">Configure display preferences</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-surface-900 mb-4">Time & Date</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-sm transition-all duration-200"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              {settings.timezone === 'auto' && (
                <p className="mt-1.5 text-xs text-surface-400">Detected: {detectedTimezone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Time Format</label>
              <div className="flex gap-4">
                {[{ value: '12h', label: '12-hour (2:30 PM)' }, { value: '24h', label: '24-hour (14:30)' }].map((opt) => (
                  <label key={opt.value} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="timeFormat"
                      value={opt.value}
                      checked={settings.timeFormat === opt.value}
                      onChange={(e) => setSettings((prev) => ({ ...prev, timeFormat: e.target.value }))}
                      className="mr-2 accent-brand-500"
                    />
                    <span className="text-sm text-surface-600">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Date Format</label>
              <select
                value={settings.dateFormat}
                onChange={(e) => setSettings((prev) => ({ ...prev, dateFormat: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 text-sm transition-all duration-200"
              >
                <option value="MMM D, YYYY">Jan 25, 2026</option>
                <option value="D MMM YYYY">25 Jan 2026</option>
                <option value="MM/DD/YYYY">01/25/2026</option>
                <option value="DD/MM/YYYY">25/01/2026</option>
                <option value="YYYY-MM-DD">2026-01-25</option>
              </select>
            </div>

            <div className="p-4 bg-surface-50 rounded-xl border border-surface-100">
              <p className="text-xs text-surface-400 mb-1">Current time preview</p>
              <p className="text-lg font-semibold text-surface-900">{getCurrentTime()}</p>
            </div>
          </div>
        </div>

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Settings saved successfully
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-surface-100">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function getGeneralSettings(): { timezone: string; dateFormat: string; timeFormat: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return defaultSettings;
}

export function formatDateTime(date: Date | string, includeDate = true): string {
  const settings = getGeneralSettings();
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  let tz: string | undefined;
  if (settings.timezone !== 'auto') {
    tz = settings.timezone;
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: settings.timeFormat === '12h',
    timeZone: tz,
  };

  if (!includeDate) {
    return dateObj.toLocaleString('en-US', timeOptions);
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    ...timeOptions,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return dateObj.toLocaleString('en-US', dateOptions);
}
