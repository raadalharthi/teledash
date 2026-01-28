// REST API Client for TeleDash
// Replaces Supabase client for data fetching

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error ${response.status}`,
      };
    }

    return data;
  } catch (error: any) {
    console.error('API request error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

// Conversations API
export const conversationsApi = {
  getAll: (archived = false, limit = 50) =>
    request<any[]>(`/api/conversations?archived=${archived}&limit=${limit}`),

  getById: (id: string) => request<any>(`/api/conversations/${id}`),

  archive: (id: string, archived = true) =>
    request<any>(`/api/conversations/${id}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ archived }),
    }),
};

// Messages API
export const messagesApi = {
  getByConversation: (conversationId: string, limit = 50, offset = 0) =>
    request<any[]>(
      `/api/messages/${conversationId}?limit=${limit}&offset=${offset}`
    ),

  send: (conversationId: string, text: string) =>
    request<any>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, text }),
    }),

  markAsRead: (conversationId: string) =>
    request<any>(`/api/messages/mark-read/${conversationId}`, {
      method: 'PATCH',
    }),
};

// Channels API (Settings)
export const channelsApi = {
  getAll: () => request<any[]>('/api/channels'),

  getByType: (type: string) => request<any>(`/api/channels/${type}`),

  save: (type: string, config: any, isActive: boolean) =>
    request<any>(`/api/channels/${type}`, {
      method: 'POST',
      body: JSON.stringify({ config, is_active: isActive }),
    }),

  test: (type: string, config: any) =>
    request<any>(`/api/channels/${type}/test`, {
      method: 'POST',
      body: JSON.stringify({ config }),
    }),
};

// Webhook API
export const webhookApi = {
  setTelegram: (url: string) =>
    request<any>('/api/webhook/set', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  deleteTelegram: () =>
    request<any>('/api/webhook/delete', {
      method: 'POST',
    }),
};

// Health check
export const healthApi = {
  check: () => request<any>('/api/health'),
};

export { API_URL };
