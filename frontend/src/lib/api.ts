// REST API Client for TeleDash

const API_URL = process.env.REACT_APP_API_URL ?? '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

// Auth token management
export function getToken(): string | null {
  return localStorage.getItem('teledash_token');
}

export function setToken(token: string): void {
  localStorage.setItem('teledash_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('teledash_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_URL}${endpoint}`;
    const token = getToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  send: (conversationId: string, text: string, options?: {
    media_type?: string;
    media_url?: string;
    reply_to_message_id?: string;
  }) =>
    request<any>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        text,
        ...options,
      }),
    }),

  edit: (messageId: string, text: string) =>
    request<any>(`/api/messages/${messageId}/edit`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    }),

  delete: (messageId: string) =>
    request<any>(`/api/messages/${messageId}`, {
      method: 'DELETE',
    }),

  react: (messageId: string, emoji: string | null) =>
    request<any>(`/api/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),

  sendTyping: (conversationId: string) =>
    request<any>('/api/messages/typing', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    }),

  getFileUrl: (fileId: string) =>
    request<any>(`/api/messages/file/${encodeURIComponent(fileId)}`),

  getContactProfile: (contactId: string) =>
    request<any>(`/api/messages/contact/${contactId}/profile`),

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

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    request<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  getMe: () => request<any>('/api/auth/me'),
};

export { API_URL };
