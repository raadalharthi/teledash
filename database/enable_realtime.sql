-- IMPORTANT: Run this in Supabase SQL Editor to enable real-time!
-- Go to: Supabase Dashboard -> SQL Editor -> New Query -> Paste this -> Run

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for conversations table
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Enable realtime for contacts table
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;

-- Verify realtime is enabled (should show your tables)
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
