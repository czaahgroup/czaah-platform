-- Group chats
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS group_chat_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  is_read_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Broadcasts
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sent_by UUID NOT NULL REFERENCES profiles(id),
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id)
);

-- Indexes
CREATE INDEX idx_group_members_chat ON group_chat_members(chat_id);
CREATE INDEX idx_group_members_user ON group_chat_members(user_id);
CREATE INDEX idx_group_messages_chat ON group_messages(chat_id);
CREATE INDEX idx_group_messages_created ON group_messages(created_at);
CREATE INDEX idx_broadcasts_sent ON broadcasts(sent_at);
CREATE INDEX idx_broadcast_reads_broadcast ON broadcast_reads(broadcast_id);
CREATE INDEX idx_broadcast_reads_user ON broadcast_reads(user_id);

-- RLS
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_reads ENABLE ROW LEVEL SECURITY;

-- Group chat policies: members can see their groups
CREATE POLICY gc_select ON group_chats FOR SELECT
  USING (id IN (SELECT chat_id FROM group_chat_members WHERE user_id = auth.uid()) OR is_super_admin());
CREATE POLICY gc_insert ON group_chats FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY gc_update ON group_chats FOR UPDATE
  USING (created_by = auth.uid() OR is_super_admin());

CREATE POLICY gcm_select ON group_chat_members FOR SELECT
  USING (chat_id IN (SELECT chat_id FROM group_chat_members WHERE user_id = auth.uid()) OR is_super_admin());
CREATE POLICY gcm_insert ON group_chat_members FOR INSERT
  WITH CHECK (TRUE); -- handled by API
CREATE POLICY gcm_delete ON group_chat_members FOR DELETE
  USING (user_id = auth.uid() OR chat_id IN (SELECT id FROM group_chats WHERE created_by = auth.uid()) OR is_super_admin());

CREATE POLICY gm_select ON group_messages FOR SELECT
  USING (chat_id IN (SELECT chat_id FROM group_chat_members WHERE user_id = auth.uid()) OR is_super_admin());
CREATE POLICY gm_insert ON group_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND chat_id IN (SELECT chat_id FROM group_chat_members WHERE user_id = auth.uid()));

-- Broadcast policies
CREATE POLICY bc_select ON broadcasts FOR SELECT
  USING (is_super_admin() OR target_roles && ARRAY[(SELECT role::text FROM profiles WHERE id = auth.uid())]);
CREATE POLICY bc_insert ON broadcasts FOR INSERT
  WITH CHECK (is_super_admin());
CREATE POLICY bcr_select ON broadcast_reads FOR SELECT
  USING (user_id = auth.uid() OR is_super_admin());
CREATE POLICY bcr_insert ON broadcast_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Grants
GRANT ALL ON group_chats TO authenticated;
GRANT ALL ON group_chats TO service_role;
GRANT ALL ON group_chat_members TO authenticated;
GRANT ALL ON group_chat_members TO service_role;
GRANT ALL ON group_messages TO authenticated;
GRANT ALL ON group_messages TO service_role;
GRANT ALL ON broadcasts TO authenticated;
GRANT ALL ON broadcasts TO service_role;
GRANT ALL ON broadcast_reads TO authenticated;
GRANT ALL ON broadcast_reads TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
