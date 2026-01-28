import { useState, useCallback, useEffect } from 'react';
import { channelsApi } from '../lib/api';
import { Channel, ConnectionTestResult } from '../types';

export function useSettings() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading channels...');

      const result = await channelsApi.getAll();

      if (result.success) {
        console.log('Loaded channels:', result.channels?.length || 0);
        setChannels(result.channels || []);
        setError(null);
      } else {
        setError(result.error || 'Failed to load channels');
      }
    } catch (err: any) {
      console.error('Error loading channels:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getChannelConfig = useCallback(
    async (channelType: string): Promise<Channel | null> => {
      try {
        console.log(`Loading ${channelType} config...`);

        const result = await channelsApi.getByType(channelType);

        if (result.success) {
          return result.channel;
        }
        return null;
      } catch (err: any) {
        console.error(`Error loading ${channelType} config:`, err);
        return null;
      }
    },
    []
  );

  const saveChannelConfig = useCallback(
    async (
      channelType: string,
      config: any,
      isActive: boolean = true
    ): Promise<{ success: boolean; errors?: string[] }> => {
      try {
        setSaving(true);
        console.log(`Saving ${channelType} config...`);

        const result = await channelsApi.save(channelType, config, isActive);

        if (result.success) {
          console.log(`${channelType} config saved`);
          await loadChannels(); // Refresh list
          return { success: true };
        } else {
          console.error(`Failed to save ${channelType}:`, result.errors || result.error);
          return { success: false, errors: result.errors || [result.error] };
        }
      } catch (err: any) {
        console.error(`Error saving ${channelType}:`, err);
        return { success: false, errors: [err.message] };
      } finally {
        setSaving(false);
      }
    },
    [loadChannels]
  );

  const testConnection = useCallback(
    async (channelType: string, config: any): Promise<ConnectionTestResult> => {
      try {
        setTesting(channelType);
        console.log(`Testing ${channelType} connection...`);

        const result = await channelsApi.test(channelType, config);
        console.log(`${result.success ? 'Success' : 'Failed'} ${channelType} test:`, result);

        return result;
      } catch (err: any) {
        console.error(`Error testing ${channelType}:`, err);
        return { success: false, error: err.message };
      } finally {
        setTesting(null);
      }
    },
    []
  );

  const toggleChannel = useCallback(
    async (channelType: string, isActive: boolean) => {
      try {
        console.log(`Toggling ${channelType}: ${isActive}`);

        const channel = await getChannelConfig(channelType);
        if (channel) {
          await saveChannelConfig(channelType, channel.config, isActive);
        }
      } catch (err: any) {
        console.error(`Error toggling ${channelType}:`, err);
      }
    },
    [getChannelConfig, saveChannelConfig]
  );

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  return {
    channels,
    loading,
    error,
    saving,
    testing,
    loadChannels,
    getChannelConfig,
    saveChannelConfig,
    testConnection,
    toggleChannel,
  };
}
