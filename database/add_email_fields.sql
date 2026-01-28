-- Add email-specific fields to messages table
-- Run this in your Supabase SQL Editor

-- Add email fields to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS email_subject TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS email_from TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS email_to TEXT;

-- Enable realtime for channels table (if not already done)
ALTER PUBLICATION supabase_realtime ADD TABLE channels;

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages'
AND column_name LIKE 'email%';
