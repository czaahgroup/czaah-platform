-- ============================================================
-- P3-C — deal room
-- ============================================================
-- A "deal" is a transaction in progress against a property listing or an
-- investment opportunity: a pipeline stage, financials, and a set of
-- participants drawn from the CRM (buyer / seller / investor / agent …).
-- Notes, tasks, documents and the timeline attach through the existing
-- crm_* machinery via related_type = 'deal'.
--
-- Security model matches the other crm_* tables: RLS on, `authenticated`
-- gets SELECT only, every write goes through a service-role API route.
--
-- Written replay-safe (no local Docker to test against).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE deal_kind AS ENUM ('property_sale','property_rental','investment','advisory','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deal_stage AS ENUM ('lead','qualified','proposal','negotiation','due_diligence','agreement','closed_won','closed_lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deal_party_role AS ENUM ('buyer','seller','investor','landlord','tenant','agent','advisor','lender','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS deals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference         TEXT UNIQUE,
  title             TEXT NOT NULL,
  kind              deal_kind NOT NULL DEFAULT 'other',
  stage             deal_stage NOT NULL DEFAULT 'lead',
  property_id       UUID REFERENCES property_listings(id) ON DELETE SET NULL,
  investment_id     UUID REFERENCES investment_opportunities(id) ON DELETE SET NULL,
  company_id        UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  country           CHAR(2) REFERENCES countries(code) ON DELETE SET NULL,
  value_amount      NUMERIC(16,2),
  agreed_amount     NUMERIC(16,2),
  currency          CHAR(3) REFERENCES currencies(code) ON DELETE SET NULL,
  commission_amount NUMERIC(14,2),
  probability       INT NOT NULL DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  expected_close    DATE,
  closed_at         DATE,
  lost_reason       TEXT,
  description       TEXT,
  owner_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deals_stage      ON deals (stage);
CREATE INDEX IF NOT EXISTS idx_deals_kind       ON deals (kind);
CREATE INDEX IF NOT EXISTS idx_deals_owner      ON deals (owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_property   ON deals (property_id);
CREATE INDEX IF NOT EXISTS idx_deals_investment ON deals (investment_id);
CREATE INDEX IF NOT EXISTS idx_deals_company    ON deals (company_id);
CREATE INDEX IF NOT EXISTS idx_deals_expected   ON deals (expected_close) WHERE stage NOT IN ('closed_won','closed_lost');
CREATE OR REPLACE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Keep probability / closed_at consistent with the stage.
CREATE OR REPLACE FUNCTION deals_sync_stage() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage OR TG_OP = 'INSERT' THEN
    IF NEW.stage = 'closed_won' THEN
      NEW.probability := 100;
      IF NEW.closed_at IS NULL THEN NEW.closed_at := CURRENT_DATE; END IF;
    ELSIF NEW.stage = 'closed_lost' THEN
      NEW.probability := 0;
      IF NEW.closed_at IS NULL THEN NEW.closed_at := CURRENT_DATE; END IF;
    ELSE
      NEW.closed_at := NULL;
      NEW.lost_reason := NULL;
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER deals_sync_stage_ins BEFORE INSERT ON deals
  FOR EACH ROW EXECUTE FUNCTION deals_sync_stage();
CREATE OR REPLACE TRIGGER deals_sync_stage_upd BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION deals_sync_stage();

CREATE TABLE IF NOT EXISTS deal_parties (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id     UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id  UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES crm_companies(id) ON DELETE CASCADE,
  role        deal_party_role NOT NULL DEFAULT 'other',
  note        TEXT,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_deal_parties_deal    ON deal_parties (deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_parties_contact ON deal_parties (contact_id);
CREATE INDEX IF NOT EXISTS idx_deal_parties_company ON deal_parties (company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_parties_uniq_contact ON deal_parties (deal_id, contact_id, role) WHERE contact_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_parties_uniq_company ON deal_parties (deal_id, company_id, role) WHERE company_id IS NOT NULL AND contact_id IS NULL;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE deals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deals_select ON deals;
CREATE POLICY deals_select ON deals FOR SELECT
  USING (is_super_admin() OR is_admin() OR owner_id = auth.uid() OR created_by = auth.uid());
DROP POLICY IF EXISTS deals_write ON deals;
CREATE POLICY deals_write ON deals FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS deal_parties_select ON deal_parties;
CREATE POLICY deal_parties_select ON deal_parties FOR SELECT
  USING (is_super_admin() OR is_admin() OR created_by = auth.uid()
         OR deal_id IN (SELECT id FROM deals WHERE owner_id = auth.uid() OR created_by = auth.uid()));
DROP POLICY IF EXISTS deal_parties_write ON deal_parties;
CREATE POLICY deal_parties_write ON deal_parties FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

REVOKE ALL ON deals, deal_parties FROM anon, authenticated;
GRANT SELECT ON deals, deal_parties TO authenticated;
GRANT ALL ON deals, deal_parties TO service_role;
