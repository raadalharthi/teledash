-- WhatsApp Integration Migration

-- Add WhatsApp message ID column for tracking Evolution API message IDs
ALTER TABLE messages ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(255);

-- Create index for efficient WhatsApp message lookups
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id);

-- Note: contacts.whatsapp_id already exists in schema
-- Note: conversations.channel_type already supports 'whatsapp'
