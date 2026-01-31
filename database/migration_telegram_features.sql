-- Migration: Telegram Features (media, replies, edit, delete, reactions)

-- Add reply threading support
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_telegram_id INTEGER;

-- Add edit/delete support
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

-- Add file metadata for media messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name VARCHAR(500);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration INTEGER; -- for voice/video in seconds
ALTER TABLE messages ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS height INTEGER;

-- Add inline keyboard data
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_markup JSONB;

-- Add reactions support
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;

-- Add callback_query_data for tracking button presses
ALTER TABLE messages ADD COLUMN IF NOT EXISTS callback_data JSONB;

-- Add profile photo URL to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS username VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;

-- Index for reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_telegram_id ON messages(telegram_message_id);
