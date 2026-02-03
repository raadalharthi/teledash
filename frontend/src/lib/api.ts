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

  uploadFile: async (conversationId: string, file: File, caption?: string, replyToMessageId?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', conversationId);
      if (caption) formData.append('caption', caption);
      if (replyToMessageId) formData.append('reply_to_message_id', replyToMessageId);

      const token = getToken();
      const response = await fetch(`${API_URL}/api/messages/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
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

  // WhatsApp-specific endpoints
  whatsappQRCode: () => request<any>('/api/channels/whatsapp/qrcode'),

  whatsappStatus: () => request<any>('/api/channels/whatsapp/status'),

  whatsappLogout: () =>
    request<any>('/api/channels/whatsapp/logout', { method: 'POST' }),

  whatsappCreateInstance: (instanceName: string) =>
    request<any>('/api/channels/whatsapp/instance', {
      method: 'POST',
      body: JSON.stringify({ instance_name: instanceName }),
    }),

  whatsappSetWebhook: (url: string) =>
    request<any>('/api/channels/whatsapp/webhook/set', {
      method: 'POST',
      body: JSON.stringify({ url }),
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

// Tickets API
export const ticketsApi = {
  getAll: (filters?: { status?: string; priority?: string; search?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return request<any>(`/api/tickets${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => request<any>(`/api/tickets/${id}`),

  create: (data: { title: string; description?: string; priority?: string; conversation_id?: string; contact_id?: string; tags?: string[] }) =>
    request<any>('/api/tickets', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { status?: string; priority?: string; assigned_to?: string; title?: string; description?: string; tags?: string[] }) =>
    request<any>(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  addComment: (id: string, text: string, isInternal?: boolean) =>
    request<any>(`/api/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify({ text, is_internal: isInternal }) }),

  delete: (id: string) =>
    request<any>(`/api/tickets/${id}`, { method: 'DELETE' }),
};

// Organizations API
export const organizationsApi = {
  getCurrent: () => request<any>('/api/organizations/current'),
  create: (name: string) => request<any>('/api/organizations', { method: 'POST', body: JSON.stringify({ name }) }),
  getMembers: () => request<any>('/api/organizations/members'),
  invite: (email: string, role?: string) => request<any>('/api/organizations/invite', { method: 'POST', body: JSON.stringify({ email, role }) }),
  acceptInvite: (token: string) => request<any>('/api/organizations/accept-invite', { method: 'POST', body: JSON.stringify({ token }) }),
  updateMember: (userId: string, data: { role?: string; is_active?: boolean }) =>
    request<any>(`/api/organizations/members/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const analyticsApi = {
  getOverview: () => request<any>('/api/analytics/overview'),
  getActivity: (limit = 50) => request<any>(`/api/analytics/activity?limit=${limit}`),
};

export { API_URL };
