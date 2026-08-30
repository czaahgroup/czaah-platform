-- ============================================================
-- CRM CORE (P1B)
-- ============================================================
-- Companies, contacts, tasks, notes, and cross-object links — a thin
-- CRM layer over the platform's existing data. Nothing here replaces a
-- table; contacts point back at profiles / partners where the person is
-- already a platform user, and links associate existing enquiries,
-- opportunities and mail threads with a contact or company.
--
-- Security model for every crm_* table:
--   * RLS enabled, policies below.
--   * `authenticated` is granted SELECT only. Every write goes through a
--     service-role API route (same as the rest of the platform). This
--     removes the column-privilege-escalation class for these tables —
--     see the P1A finding in docs/rls-matrix.md.
--
-- Written replay-safe: this migration cannot be locally tested (no Docker
-- in the dev env), so every statement is guarded to survive a partial
-- apply + re-run.
-- ============================================================

-- ---- enums ----------------------------------------------------------

DO $$ BEGIN CREATE TYPE crm_contact_type AS ENUM ('lead','prospect','client','partner','vendor','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE crm_lifecycle_stage AS ENUM ('new','engaged','qualified','active','dormant','lost'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE crm_task_status AS ENUM ('open','done','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE crm_task_priority AS ENUM ('low','normal','high','urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE crm_object AS ENUM ('contact','company','enquiry','partner_opportunity','investment_opportunity','mail_thread'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- companies -----------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  domain      TEXT,
  website     TEXT,
  sector_id   UUID REFERENCES sectors(id) ON DELETE SET NULL,
  country     TEXT,
  company_size TEXT,
  stage       crm_lifecycle_stage NOT NULL DEFAULT 'new',
  owner_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  description TEXT,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_companies_name   ON crm_companies (lower(name));
CREATE INDEX IF NOT EXISTS idx_crm_companies_domain ON crm_companies (lower(domain)) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_companies_owner  ON crm_companies (owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_sector ON crm_companies (sector_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_stage  ON crm_companies (stage);
CREATE OR REPLACE TRIGGER crm_companies_updated_at BEFORE UPDATE ON crm_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- contacts -----------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_contacts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  company_id   UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  title        TEXT,
  type         crm_contact_type NOT NULL DEFAULT 'lead',
  stage        crm_lifecycle_stage NOT NULL DEFAULT 'new',
  source       TEXT,
  owner_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  notes        TEXT,
  last_activity_at TIMESTAMPTZ,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_email   ON crm_contacts (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_profile ON crm_contacts (profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company  ON crm_contacts (company_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner    ON crm_contacts (owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_type     ON crm_contacts (type);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_stage    ON crm_contacts (stage);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_activity ON crm_contacts (last_activity_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tags     ON crm_contacts USING GIN (tags);
CREATE OR REPLACE TRIGGER crm_contacts_updated_at BEFORE UPDATE ON crm_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- tasks -------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT,
  status       crm_task_status NOT NULL DEFAULT 'open',
  priority     crm_task_priority NOT NULL DEFAULT 'normal',
  due_at       TIMESTAMPTZ,
  reminder_at  TIMESTAMPTZ,
  reminded_at  TIMESTAMPTZ,
  assignee_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  related_type crm_object,
  related_id   UUID,
  completed_at TIMESTAMPTZ,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((related_type IS NULL) = (related_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assignee ON crm_tasks (assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due      ON crm_tasks (due_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_crm_tasks_related  ON crm_tasks (related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_reminder ON crm_tasks (reminder_at) WHERE status = 'open' AND reminded_at IS NULL;
CREATE OR REPLACE TRIGGER crm_tasks_updated_at BEFORE UPDATE ON crm_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- notes ------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  body         TEXT NOT NULL,
  author_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  related_type crm_object NOT NULL,
  related_id   UUID NOT NULL,
  pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_notes_related ON crm_notes (related_type, related_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_notes_author  ON crm_notes (author_id);
CREATE OR REPLACE TRIGGER crm_notes_updated_at BEFORE UPDATE ON crm_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- links ------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type crm_object NOT NULL,
  source_id   UUID NOT NULL,
  contact_id  UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES crm_companies(id) ON DELETE CASCADE,
  linked_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_links_src_contact ON crm_links (source_type, source_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_links_src_company ON crm_links (source_type, source_id, company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_links_source  ON crm_links (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_crm_links_contact ON crm_links (contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_links_company ON crm_links (company_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_links     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_companies_select ON crm_companies;
CREATE POLICY crm_companies_select ON crm_companies FOR SELECT
  USING (is_super_admin() OR is_admin() OR owner_id = auth.uid() OR created_by = auth.uid());
DROP POLICY IF EXISTS crm_companies_write ON crm_companies;
CREATE POLICY crm_companies_write ON crm_companies FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS crm_contacts_select ON crm_contacts;
CREATE POLICY crm_contacts_select ON crm_contacts FOR SELECT
  USING (is_super_admin() OR is_admin() OR owner_id = auth.uid() OR created_by = auth.uid() OR profile_id = auth.uid());
DROP POLICY IF EXISTS crm_contacts_write ON crm_contacts;
CREATE POLICY crm_contacts_write ON crm_contacts FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS crm_tasks_select ON crm_tasks;
CREATE POLICY crm_tasks_select ON crm_tasks FOR SELECT
  USING (is_super_admin() OR is_admin() OR assignee_id = auth.uid() OR created_by = auth.uid());
DROP POLICY IF EXISTS crm_tasks_write ON crm_tasks;
CREATE POLICY crm_tasks_write ON crm_tasks FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS crm_notes_select ON crm_notes;
CREATE POLICY crm_notes_select ON crm_notes FOR SELECT
  USING (is_super_admin() OR is_admin() OR author_id = auth.uid());
DROP POLICY IF EXISTS crm_notes_write ON crm_notes;
CREATE POLICY crm_notes_write ON crm_notes FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS crm_links_select ON crm_links;
CREATE POLICY crm_links_select ON crm_links FOR SELECT
  USING (is_super_admin() OR is_admin() OR linked_by = auth.uid());
DROP POLICY IF EXISTS crm_links_write ON crm_links;
CREATE POLICY crm_links_write ON crm_links FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

-- ---- grants: SELECT only; all writes are service-role (API routes) ----

REVOKE ALL ON crm_companies, crm_contacts, crm_tasks, crm_notes, crm_links FROM anon, authenticated;
GRANT SELECT ON crm_companies, crm_contacts, crm_tasks, crm_notes, crm_links TO authenticated;
GRANT ALL ON crm_companies, crm_contacts, crm_tasks, crm_notes, crm_links TO service_role;
