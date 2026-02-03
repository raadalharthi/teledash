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
  username?: string;
  bio?: string;
  last_seen?: string;
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

export interface MessageReaction {
  type: string;
  emoji: string;
  user_id: string;
}

export interface ReplyToMessage {
  id: string;
  text?: string;
  sender_type: string;
  media_type?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'bot' | 'admin';
  sender_id?: string;
  text?: string;
  media_type?: 'photo' | 'video' | 'document' | 'voice' | 'audio' | 'sticker' | 'video_note';
  media_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  duration?: number;
  width?: number;
  height?: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  telegram_message_id?: number;
  whatsapp_message_id?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  edited_at?: string;
  reply_to_message_id?: string;
  reply_to_telegram_id?: number;
  reply_to_message?: ReplyToMessage;
  reply_markup?: any;
  reactions?: MessageReaction[];
  callback_data?: any[];
  email_subject?: string;
  email_from?: string;
  email_to?: string;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  channel_type: 'telegram' | 'email' | 'whatsapp' | 'sms';
  is_active: boolean;
  config: TelegramConfig | EmailConfig | WhatsAppConfig | Record<string, any>;
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
  from_name?: string;
  from_email?: string;
}

export interface WhatsAppConfig {
  evolution_api_url: string;
  api_key: string;
  instance_name: string;
  connected?: boolean;
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

// Ticket types

export interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  conversation_id?: string;
  contact_id?: string;
  contact?: Contact;
  assigned_to?: string;
  assignee?: { id: string; name: string; email: string };
  created_by?: string;
  creator?: { id: string; name: string; email: string };
  sla_deadline?: string;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  author?: { id: string; name: string; email: string };
  text: string;
  is_internal: boolean;
  created_at: string;
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
  reply_to_message_id?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: string;
  telegram_message_id?: number;
  whatsapp_message_id?: string;
  error?: string;
}
