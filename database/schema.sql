-- TeleDash Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Contacts table: Store information about users/customers across all channels
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  telegram_id VARCHAR(255) UNIQUE,
  whatsapp_id VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_contacts_telegram_id ON contacts(telegram_id);
CREATE INDEX idx_contacts_whatsapp_id ON contacts(whatsapp_id);

-- Conversations table: Each conversation represents a chat thread
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_type VARCHAR(50) NOT NULL, -- 'telegram', 'whatsapp', 'sms', 'email'
  channel_chat_id VARCHAR(255) NOT NULL, -- Original chat ID from the channel
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  last_message_text TEXT,
  last_message_time TIMESTAMP,
  unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_type, channel_chat_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_channel ON conversations(channel_type, channel_chat_id);

-- Messages table: All messages across all channels
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL, -- 'user', 'bot', 'admin'
  sender_id VARCHAR(255), -- Telegram user ID, admin ID, etc.
  text TEXT,
  media_type VARCHAR(50), -- 'photo', 'video', 'document', 'voice', 'audio', 'sticker'
  media_url TEXT, -- Supabase Storage URL or Telegram file_id
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  telegram_message_id INTEGER, -- Original message ID from Telegram
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Channels table: Configuration for each communication channel
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_type VARCHAR(50) NOT NULL UNIQUE, -- 'telegram', 'whatsapp', 'sms', 'email'
  is_active BOOLEAN DEFAULT true,
  config JSONB, -- Store API keys, tokens, webhook URLs, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table for authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional but recommended for production)
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Insert initial Telegram channel configuration
INSERT INTO channels (channel_type, is_active, config) VALUES
  ('telegram', true, '{"bot_token": "7700088792:AAH724gnfhyxN7-GTulyhp4IhYpmaP12cA8"}'::jsonb);

-- =====================================================
-- IMPORTANT: Enable Realtime for tables
-- This is REQUIRED for real-time messaging to work!
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;

-- Verify realtime is enabled (should show your tables)
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Sample queries for testing (you can run these after setup)
-- View all conversations with latest message
-- SELECT c.*, co.name as contact_name
-- FROM conversations c
-- LEFT JOIN contacts co ON c.contact_id = co.id
-- ORDER BY c.last_message_time DESC;

-- View messages for a specific conversation
-- SELECT * FROM messages
-- WHERE conversation_id = 'YOUR_CONVERSATION_ID'
-- ORDER BY created_at ASC;
