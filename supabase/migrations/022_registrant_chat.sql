-- ============================================
-- LIVE CHAT FOR EMPLOYER / EMPLOYMENT PROMOTER (OEP) ACCOUNTS
-- One support thread per registrant account, with Super Admin.
-- Mirrors the partner_chats/partner_messages pattern (016_partner_network.sql).
-- ============================================

CREATE TABLE registrant_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

CREATE TABLE registrant_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES registrant_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registrant_chats_profile ON registrant_chats(profile_id);
CREATE INDEX idx_registrant_messages_chat ON registrant_messages(chat_id);

ALTER TABLE registrant_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrant_messages ENABLE ROW LEVEL SECURITY;

-- registrant_chats: the owning registrant + super_admin
CREATE POLICY rc_select ON registrant_chats FOR SELECT USING (
  profile_id = auth.uid() OR is_super_admin()
);
CREATE POLICY rc_insert ON registrant_chats FOR INSERT WITH CHECK (
  profile_id = auth.uid() OR is_super_admin()
);
CREATE POLICY rc_all_admin ON registrant_chats FOR ALL USING (is_super_admin());

-- registrant_messages: participants of that chat (the owning registrant) + super_admin
CREATE POLICY rm_select ON registrant_messages FOR SELECT USING (
  chat_id IN (SELECT id FROM registrant_chats WHERE profile_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY rm_insert ON registrant_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND (
    chat_id IN (SELECT id FROM registrant_chats WHERE profile_id = auth.uid())
    OR is_super_admin()
  )
);
CREATE POLICY rm_update ON registrant_messages FOR UPDATE USING (
  chat_id IN (SELECT id FROM registrant_chats WHERE profile_id = auth.uid())
  OR is_super_admin()
);

GRANT ALL ON registrant_chats TO authenticated;
GRANT ALL ON registrant_chats TO service_role;
GRANT ALL ON registrant_messages TO authenticated;
GRANT ALL ON registrant_messages TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE registrant_messages;
