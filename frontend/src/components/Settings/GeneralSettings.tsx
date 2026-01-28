import React, { useState, useEffect } from 'react';

// Common timezones list
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

  // Load settings from localStorage
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

    // Detect browser timezone
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

      // Dispatch event so other components can react to settings change
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
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-3xl">&#9881;</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
            <p className="text-sm text-gray-500">Configure display preferences</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Timezone Section */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Time & Date</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              {settings.timezone === 'auto' && (
                <p className="mt-1 text-xs text-gray-500">
                  Detected timezone: {detectedTimezone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="timeFormat"
                    value="12h"
                    checked={settings.timeFormat === '12h'}
                    onChange={(e) => setSettings((prev) => ({ ...prev, timeFormat: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">12-hour (2:30 PM)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="timeFormat"
                    value="24h"
                    checked={settings.timeFormat === '24h'}
                    onChange={(e) => setSettings((prev) => ({ ...prev, timeFormat: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">24-hour (14:30)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                value={settings.dateFormat}
                onChange={(e) => setSettings((prev) => ({ ...prev, dateFormat: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white"
              >
                <option value="MMM D, YYYY">Jan 25, 2026</option>
                <option value="D MMM YYYY">25 Jan 2026</option>
                <option value="MM/DD/YYYY">01/25/2026</option>
                <option value="DD/MM/YYYY">25/01/2026</option>
                <option value="YYYY-MM-DD">2026-01-25</option>
              </select>
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current time preview:</p>
              <p className="text-lg font-medium text-gray-900">{getCurrentTime()}</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-4 rounded-lg bg-green-50 text-green-800 flex items-center gap-2">
            <span>&#10003;</span> Settings saved successfully
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-telegram-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to get current settings (can be imported by other components)
export function getGeneralSettings(): GeneralSettingsData {
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

// Helper to format date with user's timezone preference
export function formatDateTime(date: Date | string, includeDate = true): string {
  const settings = getGeneralSettings();
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Get the timezone
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
