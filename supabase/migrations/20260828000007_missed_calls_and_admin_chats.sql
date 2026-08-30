-- Add missed_call to notification type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'missed_call';

-- Missed calls log
CREATE TABLE IF NOT EXISTS call_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL CHECK (status IN ('missed', 'declined', 'completed')),
  duration_seconds INT DEFAULT 0,
  chat_context_type TEXT CHECK (chat_context_type IN ('enquiry', 'direct', 'admin')),
  chat_context_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_log_receiver ON call_log(receiver_id);
CREATE INDEX idx_call_log_caller ON call_log(caller_id);
CREATE INDEX idx_call_log_created ON call_log(created_at);

ALTER TABLE call_log ENABLE ROW LEVEL SECURITY;

-- Users can see calls they were part of
CREATE POLICY call_log_select ON call_log FOR SELECT
  USING (caller_id = auth.uid() OR receiver_id = auth.uid() OR is_super_admin());

-- System can insert (via service role)
GRANT ALL ON call_log TO authenticated;
GRANT ALL ON call_log TO service_role;

-- Admin-to-admin direct chats
CREATE TABLE IF NOT EXISTS admin_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id UUID NOT NULL REFERENCES profiles(id),
  user_b_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  UNIQUE(user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES admin_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_chats_a ON admin_chats(user_a_id);
CREATE INDEX idx_admin_chats_b ON admin_chats(user_b_id);
CREATE INDEX idx_admin_messages_chat ON admin_messages(chat_id);
CREATE INDEX idx_admin_messages_created ON admin_messages(created_at);

ALTER TABLE admin_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_chats_select ON admin_chats FOR SELECT
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid() OR is_super_admin());
CREATE POLICY admin_chats_insert ON admin_chats FOR INSERT
  WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());
CREATE POLICY admin_messages_select ON admin_messages FOR SELECT
  USING (chat_id IN (SELECT id FROM admin_chats WHERE user_a_id = auth.uid() OR user_b_id = auth.uid()) OR is_super_admin());
CREATE POLICY admin_messages_insert ON admin_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY admin_messages_update ON admin_messages FOR UPDATE
  USING (chat_id IN (SELECT id FROM admin_chats WHERE user_a_id = auth.uid() OR user_b_id = auth.uid()) OR is_super_admin());

GRANT ALL ON admin_chats TO authenticated;
GRANT ALL ON admin_chats TO service_role;
GRANT ALL ON admin_messages TO authenticated;
GRANT ALL ON admin_messages TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE admin_messages;
