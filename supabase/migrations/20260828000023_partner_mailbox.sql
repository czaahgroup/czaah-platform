-- ============================================
-- CZAAH PARTNER MAILBOX
-- ============================================

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE partner_mailboxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL UNIQUE REFERENCES partners(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mailbox_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox_id UUID NOT NULL REFERENCES partner_mailboxes(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  external_address TEXT NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mailbox_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES mailbox_threads(id) ON DELETE CASCADE,
  mailbox_id UUID NOT NULL REFERENCES partner_mailboxes(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  message_id_header TEXT,
  in_reply_to TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mailbox_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES mailbox_messages(id) ON DELETE CASCADE,
  filename TEXT,
  content_type TEXT,
  size INTEGER,
  storage_path TEXT NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_partner_mailboxes_partner ON partner_mailboxes(partner_id);
CREATE INDEX idx_mailbox_threads_mailbox ON mailbox_threads(mailbox_id);
CREATE INDEX idx_mailbox_messages_thread ON mailbox_messages(thread_id);
CREATE INDEX idx_mailbox_messages_mailbox ON mailbox_messages(mailbox_id);
CREATE INDEX idx_mailbox_attachments_message ON mailbox_attachments(message_id);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE partner_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_attachments ENABLE ROW LEVEL SECURITY;

-- partner_mailboxes: owning partner reads their own; super_admin sees/manages all
CREATE POLICY pmb_select ON partner_mailboxes FOR SELECT USING (
  partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY pmb_all_admin ON partner_mailboxes FOR ALL USING (is_super_admin());

-- mailbox_threads: visible to the owning partner + super_admin
CREATE POLICY mt_select ON mailbox_threads FOR SELECT USING (
  mailbox_id IN (SELECT id FROM partner_mailboxes WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  OR is_super_admin()
);
CREATE POLICY mt_all_admin ON mailbox_threads FOR ALL USING (is_super_admin());

-- mailbox_messages: visible to the owning partner + super_admin; owning partner (or super_admin) can send outbound
CREATE POLICY mm_select ON mailbox_messages FOR SELECT USING (
  mailbox_id IN (SELECT id FROM partner_mailboxes WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  OR is_super_admin()
);
CREATE POLICY mm_insert ON mailbox_messages FOR INSERT WITH CHECK (
  mailbox_id IN (SELECT id FROM partner_mailboxes WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  OR is_super_admin()
);
CREATE POLICY mm_update ON mailbox_messages FOR UPDATE USING (
  mailbox_id IN (SELECT id FROM partner_mailboxes WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  OR is_super_admin()
);

-- mailbox_attachments: visible wherever the parent message is visible
CREATE POLICY ma_select ON mailbox_attachments FOR SELECT USING (
  message_id IN (
    SELECT id FROM mailbox_messages WHERE mailbox_id IN (SELECT id FROM partner_mailboxes WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  )
  OR is_super_admin()
);
CREATE POLICY ma_all_admin ON mailbox_attachments FOR ALL USING (is_super_admin());

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON partner_mailboxes TO authenticated;
GRANT ALL ON partner_mailboxes TO service_role;
GRANT ALL ON mailbox_threads TO authenticated;
GRANT ALL ON mailbox_threads TO service_role;
GRANT ALL ON mailbox_messages TO authenticated;
GRANT ALL ON mailbox_messages TO service_role;
GRANT ALL ON mailbox_attachments TO authenticated;
GRANT ALL ON mailbox_attachments TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE mailbox_messages;
