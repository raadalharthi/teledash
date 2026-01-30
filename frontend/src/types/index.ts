// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
}

// Database types

export interface Contact {
  id: string;
  name: string;
  telegram_id?: string;
  whatsapp_id?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  channel_type: 'telegram' | 'whatsapp' | 'sms' | 'email';
  channel_chat_id: string;
  contact_id?: string;
  contact?: Contact;
  last_message_text?: string;
  last_message_time?: string;
  unread_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'bot' | 'admin';
  sender_id?: string;
  text?: string;
  media_type?: 'photo' | 'video' | 'document' | 'voice' | 'audio' | 'sticker';
  media_url?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  telegram_message_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  channel_type: 'telegram' | 'email' | 'whatsapp' | 'sms';
  is_active: boolean;
  config: TelegramConfig | EmailConfig | Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TelegramConfig {
  bot_token: string;
}

export interface EmailConfig {
  email: string;
  password: string;
  display_name?: string;
  // Auto-detected or manually overridden
  imap?: {
    host: string;
    port: number;
    secure: boolean;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
  };
  // Legacy fields for backwards compat
  from_name?: string;
  from_email?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  bot_info?: {
    username: string;
    first_name: string;
    id: number;
  };
}

// API Response types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  text?: string;
  media_type?: string;
  media_url?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: string;
  telegram_message_id?: number;
  error?: string;
}
