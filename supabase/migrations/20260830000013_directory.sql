-- ============================================================
-- P3-A — global business directory
-- ============================================================
-- Extends crm_companies into the directory of every organisation CZAAH
-- deals with: companies, investors, partner firms, government bodies,
-- funds, and trading counterparties. The other Phase-3 modules reference
-- these rows rather than copying organisation data.

DO $$ BEGIN
  CREATE TYPE crm_org_type AS ENUM ('company','investor','partner_firm','government','fund','counterparty','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_kyc_status AS ENUM ('none','pending','cleared','flagged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS org_type            crm_org_type NOT NULL DEFAULT 'company';
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS regulator           TEXT;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS jurisdiction        CHAR(2) REFERENCES countries(code) ON DELETE SET NULL;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS kyc_status          crm_kyc_status NOT NULL DEFAULT 'none';
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS is_directory_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_crm_companies_org_type ON crm_companies (org_type);
CREATE INDEX IF NOT EXISTS idx_crm_companies_jurisdiction ON crm_companies (jurisdiction);

-- organisation-to-organisation relationships (parent/sub, represented-by, …)
CREATE TABLE IF NOT EXISTS crm_org_relationships (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_company UUID NOT NULL REFERENCES crm_companies(id) ON DELETE CASCADE,
  to_company   UUID NOT NULL REFERENCES crm_companies(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('parent_of','subsidiary_of','represents','represented_by','introduced','partner_of')),
  note         TEXT,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_company <> to_company),
  UNIQUE (from_company, to_company, kind)
);
CREATE INDEX IF NOT EXISTS idx_crm_org_rel_from ON crm_org_relationships (from_company);
CREATE INDEX IF NOT EXISTS idx_crm_org_rel_to ON crm_org_relationships (to_company);

ALTER TABLE crm_org_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_org_rel_select ON crm_org_relationships;
CREATE POLICY crm_org_rel_select ON crm_org_relationships FOR SELECT USING (is_super_admin() OR is_admin() OR created_by = auth.uid());
DROP POLICY IF EXISTS crm_org_rel_write ON crm_org_relationships;
CREATE POLICY crm_org_rel_write ON crm_org_relationships FOR ALL USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

REVOKE ALL ON crm_org_relationships FROM anon, authenticated;
GRANT SELECT ON crm_org_relationships TO authenticated;
GRANT ALL ON crm_org_relationships TO service_role;

-- Tag partner accounts' companies as partner firms where we can tell.
UPDATE crm_companies c SET org_type = 'partner_firm'
WHERE org_type = 'company'
  AND EXISTS (SELECT 1 FROM crm_contacts x WHERE x.company_id = c.id AND x.type = 'partner');
