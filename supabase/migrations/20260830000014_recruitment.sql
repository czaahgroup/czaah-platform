-- ============================================================
-- P3-B — recruitment pipeline
-- ============================================================
-- Turns the loose recruitment data (workforce_registry candidates,
-- employer_registry / oep_registry demand, a couple of columns bolted
-- onto partner_opportunities) into a real pipeline:
--
--   recruitment_job_orders  — an employer's demand for N workers of a
--                             trade in a destination country
--   recruitment_placements  — a workforce candidate moving through the
--                             deployment stages against one job order
--
-- Security model matches the crm_* tables: RLS on, `authenticated` gets
-- SELECT only, every write goes through a service-role API route.
--
-- Written replay-safe (no local Docker to test against).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE recruitment_order_status AS ENUM
    ('draft','open','partially_filled','filled','on_hold','closed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recruitment_stage AS ENUM
    ('sourced','shortlisted','interview','selected','offer','medical','visa','ticketing','deployed','rejected','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- job orders --------------------------------------------------

CREATE TABLE IF NOT EXISTS recruitment_job_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference           TEXT UNIQUE,
  title               TEXT NOT NULL,
  employer_id         UUID REFERENCES employer_registry(id) ON DELETE SET NULL,
  oep_id              UUID REFERENCES oep_registry(id) ON DELETE SET NULL,
  company_id          UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  trade_category      TEXT NOT NULL,
  specific_role       TEXT,
  destination_country CHAR(2) REFERENCES countries(code) ON DELETE SET NULL,
  headcount           INT NOT NULL DEFAULT 1 CHECK (headcount > 0),
  salary_min          NUMERIC(14,2),
  salary_max          NUMERIC(14,2),
  salary_currency     CHAR(3) REFERENCES currencies(code) ON DELETE SET NULL,
  contract_months     INT,
  requirements        TEXT,
  status              recruitment_order_status NOT NULL DEFAULT 'open',
  target_date         DATE,
  owner_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rec_orders_status   ON recruitment_job_orders (status);
CREATE INDEX IF NOT EXISTS idx_rec_orders_employer ON recruitment_job_orders (employer_id);
CREATE INDEX IF NOT EXISTS idx_rec_orders_oep      ON recruitment_job_orders (oep_id);
CREATE INDEX IF NOT EXISTS idx_rec_orders_trade    ON recruitment_job_orders (lower(trade_category));
CREATE INDEX IF NOT EXISTS idx_rec_orders_country  ON recruitment_job_orders (destination_country);
CREATE INDEX IF NOT EXISTS idx_rec_orders_owner    ON recruitment_job_orders (owner_id);
CREATE OR REPLACE TRIGGER rec_orders_updated_at BEFORE UPDATE ON recruitment_job_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- placements -------------------------------------------------

CREATE TABLE IF NOT EXISTS recruitment_placements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_order_id     UUID NOT NULL REFERENCES recruitment_job_orders(id) ON DELETE CASCADE,
  candidate_id     UUID NOT NULL REFERENCES workforce_registry(id) ON DELETE CASCADE,
  stage            recruitment_stage NOT NULL DEFAULT 'sourced',
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at      DATE,
  offered_salary   NUMERIC(14,2),
  offered_currency CHAR(3) REFERENCES currencies(code) ON DELETE SET NULL,
  notes            TEXT,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_order_id, candidate_id)
);
CREATE INDEX IF NOT EXISTS idx_rec_placements_order     ON recruitment_placements (job_order_id);
CREATE INDEX IF NOT EXISTS idx_rec_placements_candidate ON recruitment_placements (candidate_id);
CREATE INDEX IF NOT EXISTS idx_rec_placements_stage     ON recruitment_placements (stage);
CREATE OR REPLACE TRIGGER rec_placements_updated_at BEFORE UPDATE ON recruitment_placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Stamp stage_changed_at (and deployed_at) whenever the stage moves.
CREATE OR REPLACE FUNCTION recruitment_touch_stage() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at := NOW();
    IF NEW.stage = 'deployed' AND NEW.deployed_at IS NULL THEN
      NEW.deployed_at := CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER rec_placements_touch_stage BEFORE UPDATE ON recruitment_placements
  FOR EACH ROW EXECUTE FUNCTION recruitment_touch_stage();

-- Keep a job order's status in step with how many candidates are deployed,
-- unless an operator has parked it in a manual state.
CREATE OR REPLACE FUNCTION recruitment_sync_order_status() RETURNS TRIGGER AS $$
DECLARE
  v_order     UUID := COALESCE(NEW.job_order_id, OLD.job_order_id);
  v_headcount INT;
  v_status    recruitment_order_status;
  v_deployed  INT;
BEGIN
  SELECT headcount, status INTO v_headcount, v_status
    FROM recruitment_job_orders WHERE id = v_order;
  IF v_status IS NULL OR v_status IN ('draft','on_hold','closed','cancelled') THEN
    RETURN NULL;
  END IF;
  SELECT COUNT(*) INTO v_deployed
    FROM recruitment_placements WHERE job_order_id = v_order AND stage = 'deployed';
  UPDATE recruitment_job_orders SET status = CASE
      WHEN v_deployed >= v_headcount THEN 'filled'::recruitment_order_status
      WHEN v_deployed > 0            THEN 'partially_filled'::recruitment_order_status
      ELSE 'open'::recruitment_order_status
    END
  WHERE id = v_order AND status IS DISTINCT FROM CASE
      WHEN v_deployed >= v_headcount THEN 'filled'::recruitment_order_status
      WHEN v_deployed > 0            THEN 'partially_filled'::recruitment_order_status
      ELSE 'open'::recruitment_order_status
    END;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER rec_placements_sync_order
  AFTER INSERT OR UPDATE OR DELETE ON recruitment_placements
  FOR EACH ROW EXECUTE FUNCTION recruitment_sync_order_status();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE recruitment_job_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rec_orders_select ON recruitment_job_orders;
CREATE POLICY rec_orders_select ON recruitment_job_orders FOR SELECT
  USING (is_super_admin() OR is_admin() OR owner_id = auth.uid() OR created_by = auth.uid());
DROP POLICY IF EXISTS rec_orders_write ON recruitment_job_orders;
CREATE POLICY rec_orders_write ON recruitment_job_orders FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS rec_placements_select ON recruitment_placements;
CREATE POLICY rec_placements_select ON recruitment_placements FOR SELECT
  USING (is_super_admin() OR is_admin() OR created_by = auth.uid());
DROP POLICY IF EXISTS rec_placements_write ON recruitment_placements;
CREATE POLICY rec_placements_write ON recruitment_placements FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

REVOKE ALL ON recruitment_job_orders, recruitment_placements FROM anon, authenticated;
GRANT SELECT ON recruitment_job_orders, recruitment_placements TO authenticated;
GRANT ALL ON recruitment_job_orders, recruitment_placements TO service_role;
