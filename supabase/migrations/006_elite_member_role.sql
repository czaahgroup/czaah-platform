-- Add elite_member to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'elite_member';

-- Direct chat table (not tied to enquiries — elite member to admin)
CREATE TABLE IF NOT EXISTS direct_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elite_member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  UNIQUE(elite_member_id, admin_id)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES direct_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_direct_chats_elite ON direct_chats(elite_member_id);
CREATE INDEX IF NOT EXISTS idx_direct_chats_admin ON direct_chats(admin_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_chat ON direct_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON direct_messages(created_at);

-- RLS
ALTER TABLE direct_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Elite members can see their own chats
CREATE POLICY direct_chats_select_elite ON direct_chats FOR SELECT
  USING (elite_member_id = auth.uid());

-- Admins can see chats assigned to them
CREATE POLICY direct_chats_select_admin ON direct_chats FOR SELECT
  USING (admin_id = auth.uid());

-- Super admin can see all
CREATE POLICY direct_chats_select_super ON direct_chats FOR SELECT
  USING (is_super_admin());

-- Elite members can create chats
CREATE POLICY direct_chats_insert_elite ON direct_chats FOR INSERT
  WITH CHECK (elite_member_id = auth.uid());

-- Messages: participants can read
CREATE POLICY direct_messages_select ON direct_messages FOR SELECT
  USING (
    chat_id IN (
      SELECT id FROM direct_chats
      WHERE elite_member_id = auth.uid() OR admin_id = auth.uid()
    )
    OR is_super_admin()
  );

-- Messages: participants can send
CREATE POLICY direct_messages_insert ON direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND chat_id IN (
      SELECT id FROM direct_chats
      WHERE elite_member_id = auth.uid() OR admin_id = auth.uid()
    )
  );

-- Messages: mark as read
CREATE POLICY direct_messages_update ON direct_messages FOR UPDATE
  USING (
    chat_id IN (
      SELECT id FROM direct_chats
      WHERE elite_member_id = auth.uid() OR admin_id = auth.uid()
    )
    OR is_super_admin()
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
