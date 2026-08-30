-- ============================================
-- CZAAH MAIL UPGRADE
-- Signatures, archive/star/soft-delete, cc/bcc, templates, contacts CRM,
-- AI usage log, and per-mailbox labels for the partner-network Mail UI.
-- Builds on 023_partner_mailbox.sql.
--
-- NOTE: this schema was already applied to the live Supabase project by an
-- earlier session; this file is the canonical record of it and is written to
-- be replay-safe (IF NOT EXISTS on tables/columns/indexes).
-- ============================================

-- ---- column additions ----------------------------------------------------

ALTER TABLE partner_mailboxes ADD COLUMN IF NOT EXISTS signature_html TEXT;

ALTER TABLE mailbox_threads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE mailbox_threads ADD COLUMN IF NOT EXISTS starred_at  TIMESTAMPTZ;
ALTER TABLE mailbox_threads ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

ALTER TABLE mailbox_messages ADD COLUMN IF NOT EXISTS cc_addresses  TEXT[];
ALTER TABLE mailbox_messages ADD COLUMN IF NOT EXISTS bcc_addresses TEXT[];

CREATE INDEX IF NOT EXISTS idx_mailbox_threads_active
  ON mailbox_threads(mailbox_id, last_message_at DESC)
  WHERE deleted_at IS NULL;

-- ---- email templates ---------------------------------------------------

CREATE TABLE IF NOT EXISTS mail_templates (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox_id UUID REFERENCES partner_mailboxes(id) ON DELETE CASCADE,  -- NULL when is_shared
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  category   TEXT,
  subject    TEXT,
  body_html  TEXT,
  is_shared  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS mail_templates_shared_name  ON mail_templates (name)             WHERE is_shared;
CREATE UNIQUE INDEX IF NOT EXISTS mail_templates_mailbox_name ON mail_templates (mailbox_id, name) WHERE NOT is_shared;
CREATE INDEX IF NOT EXISTS idx_mail_templates_mailbox ON mail_templates(mailbox_id);

-- ---- contacts CRM (keyed by external address, org-wide) ----------------

CREATE TABLE IF NOT EXISTS mail_contacts (
  email      TEXT PRIMARY KEY,
  name       TEXT,
  company    TEXT,
  phone      TEXT,
  title      TEXT,
  notes      TEXT,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','lead','client','vendor','archived')),
  tags       TEXT[],
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- AI usage / cost audit log ---------------------------------------

CREATE TABLE IF NOT EXISTS mail_ai_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox_id    UUID REFERENCES partner_mailboxes(id) ON DELETE SET NULL,
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  thread_id     UUID REFERENCES mailbox_threads(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  model         TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mail_ai_events_mailbox ON mail_ai_events(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_mail_ai_events_created ON mail_ai_events(created_at);

-- ---- per-mailbox labels ---------------------------------------------

CREATE TABLE IF NOT EXISTS mailbox_labels (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox_id UUID NOT NULL REFERENCES partner_mailboxes(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#e6c364',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mailbox_id, name)
);
CREATE INDEX IF NOT EXISTS idx_mailbox_labels_mailbox ON mailbox_labels(mailbox_id);

CREATE TABLE IF NOT EXISTS mailbox_thread_labels (
  thread_id  UUID NOT NULL REFERENCES mailbox_threads(id) ON DELETE CASCADE,
  label_id   UUID NOT NULL REFERENCES mailbox_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, label_id)
);
CREATE INDEX IF NOT EXISTS idx_mailbox_thread_labels_thread ON mailbox_thread_labels(thread_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_thread_labels_label  ON mailbox_thread_labels(label_id);

-- ============================================
-- RLS  (all /api/mail/* routes use the service role and bypass these;
--       policies exist for defence-in-depth + any future client reads,
--       mirroring 023_partner_mailbox.sql.)
-- ============================================

ALTER TABLE mail_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_ai_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_labels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_thread_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY mtpl_select ON mail_templates FOR SELECT USING (
  is_shared
  OR mailbox_id IN (SELECT id FROM partner_mailboxes WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  OR is_super_admin()
);
CREATE POLICY mtpl_all_admin ON mail_templates FOR ALL USING (is_super_admin());

CREATE POLICY mcon_select ON mail_contacts FOR SELECT USING (
  EXISTS (SELECT 1 FROM partners WHERE profile_id = auth.uid()) OR is_super_admin()
);
CREATE POLICY mcon_all_admin ON mail_contacts FOR ALL USING (is_super_admin());

CREATE POLICY maie_select ON mail_ai_events FOR SELECT USING (
  mailbox_id IN (SELECT id FROM partner_mailboxes WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  OR is_super_admin()
);
CREATE POLICY maie_all_admin ON mail_ai_events FOR ALL USING (is_super_admin());

CREATE POLICY mlbl_select ON mailbox_labels FOR SELECT USING (
  mailbox_id IN (SELECT id FROM partner_mailboxes WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  OR is_super_admin()
);
CREATE POLICY mlbl_all_admin ON mailbox_labels FOR ALL USING (is_super_admin());

CREATE POLICY mtl_select ON mailbox_thread_labels FOR SELECT USING (
  thread_id IN (
    SELECT id FROM mailbox_threads WHERE mailbox_id IN (
      SELECT id FROM partner_mailboxes WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
    )
  )
  OR is_super_admin()
);
CREATE POLICY mtl_all_admin ON mailbox_thread_labels FOR ALL USING (is_super_admin());

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON mail_templates        TO authenticated, service_role;
GRANT ALL ON mail_contacts         TO authenticated, service_role;
GRANT ALL ON mail_ai_events        TO authenticated, service_role;
GRANT ALL ON mailbox_labels        TO authenticated, service_role;
GRANT ALL ON mailbox_thread_labels TO authenticated, service_role;

-- ============================================
-- STORAGE  (inbound worker already writes here; ensure it exists)
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('mailbox-attachments', 'mailbox-attachments', FALSE)
ON CONFLICT (id) DO NOTHING;
