-- Supabase Database Function to Process Incoming Emails
-- This function is called by the Edge Function when an email arrives

-- Create function to process incoming email
CREATE OR REPLACE FUNCTION process_incoming_email(
  p_from_email TEXT,
  p_from_name TEXT,
  p_to_email TEXT,
  p_subject TEXT,
  p_body_text TEXT,
  p_body_html TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contact_id UUID;
  v_conversation_id UUID;
  v_message_id UUID;
  v_contact_name TEXT;
BEGIN
  -- Extract name from email if not provided
  v_contact_name := COALESCE(NULLIF(p_from_name, ''), SPLIT_PART(p_from_email, '@', 1));

  -- Find or create contact
  SELECT id INTO v_contact_id
  FROM contacts
  WHERE email = p_from_email;

  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (email, name)
    VALUES (p_from_email, v_contact_name)
    RETURNING id INTO v_contact_id;
  END IF;

  -- Find or create conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE channel_type = 'email'
    AND channel_chat_id = p_from_email;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (channel_type, channel_chat_id, contact_id, unread_count)
    VALUES ('email', p_from_email, v_contact_id, 1)
    RETURNING id INTO v_conversation_id;
  ELSE
    -- Update unread count
    UPDATE conversations
    SET unread_count = unread_count + 1,
        updated_at = NOW()
    WHERE id = v_conversation_id;
  END IF;

  -- Insert message
  INSERT INTO messages (
    conversation_id,
    sender_type,
    sender_id,
    text,
    email_subject,
    email_from,
    email_to
  )
  VALUES (
    v_conversation_id,
    'user',
    p_from_email,
    COALESCE(p_body_text, p_body_html, ''),
    p_subject,
    p_from_email,
    p_to_email
  )
  RETURNING id INTO v_message_id;

  -- Update conversation with last message
  UPDATE conversations
  SET last_message_text = LEFT(COALESCE(p_body_text, p_body_html, ''), 100),
      last_message_time = NOW()
  WHERE id = v_conversation_id;

  RETURN json_build_object(
    'success', true,
    'message_id', v_message_id,
    'conversation_id', v_conversation_id,
    'contact_id', v_contact_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated and anon users (for Edge Function)
GRANT EXECUTE ON FUNCTION process_incoming_email TO anon;
GRANT EXECUTE ON FUNCTION process_incoming_email TO authenticated;
GRANT EXECUTE ON FUNCTION process_incoming_email TO service_role;
