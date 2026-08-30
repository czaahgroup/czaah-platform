-- ============================================================
-- P3-D — construction & development
-- ============================================================
-- Construction / development projects, their phases (milestones) and
-- dated progress updates. Client is a crm_company; notes, tasks and
-- documents attach through crm_* via related_type = 'construction_project'.
--
-- Security model matches the other crm_* tables: RLS on, `authenticated`
-- gets SELECT only, every write goes through a service-role API route.
--
-- Written replay-safe (no local Docker to test against).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE construction_project_type AS ENUM ('residential','commercial','industrial','infrastructure','mixed_use','fit_out','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction_status AS ENUM ('planning','tendering','awarded','in_progress','on_hold','completed','handover','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction_milestone_status AS ENUM ('pending','in_progress','done','blocked','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS construction_projects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference        TEXT UNIQUE,
  name             TEXT NOT NULL,
  project_type     construction_project_type NOT NULL DEFAULT 'other',
  status           construction_status NOT NULL DEFAULT 'planning',
  client_company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  deal_id          UUID REFERENCES deals(id) ON DELETE SET NULL,
  site_location    TEXT,
  country          CHAR(2) REFERENCES countries(code) ON DELETE SET NULL,
  contract_value   NUMERIC(16,2),
  budget           NUMERIC(16,2),
  currency         CHAR(3) REFERENCES currencies(code) ON DELETE SET NULL,
  progress_pct     INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  start_date       DATE,
  target_completion DATE,
  actual_completion DATE,
  description      TEXT,
  owner_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_construction_status  ON construction_projects (status);
CREATE INDEX IF NOT EXISTS idx_construction_type    ON construction_projects (project_type);
CREATE INDEX IF NOT EXISTS idx_construction_client  ON construction_projects (client_company_id);
CREATE INDEX IF NOT EXISTS idx_construction_owner   ON construction_projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_construction_country ON construction_projects (country);
CREATE OR REPLACE TRIGGER construction_projects_updated_at BEFORE UPDATE ON construction_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS construction_milestones (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       construction_milestone_status NOT NULL DEFAULT 'pending',
  weight       INT NOT NULL DEFAULT 1 CHECK (weight > 0),
  sort_order   INT NOT NULL DEFAULT 0,
  target_date  DATE,
  done_date    DATE,
  note         TEXT,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_construction_ms_project ON construction_milestones (project_id, sort_order);
CREATE OR REPLACE TRIGGER construction_milestones_updated_at BEFORE UPDATE ON construction_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS construction_updates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  report_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_pct INT CHECK (progress_pct BETWEEN 0 AND 100),
  headline     TEXT NOT NULL,
  body         TEXT,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_construction_upd_project ON construction_updates (project_id, report_date DESC);

-- Recompute a project's progress from its weighted milestones, and set the
-- status/completion date when everything is done. Manual progress edits and
-- progress on a project with no milestones are left alone.
CREATE OR REPLACE FUNCTION construction_recalc_progress() RETURNS TRIGGER AS $$
DECLARE
  v_project UUID := COALESCE(NEW.project_id, OLD.project_id);
  v_total   NUMERIC;
  v_done    NUMERIC;
  v_pct     INT;
BEGIN
  SELECT COALESCE(SUM(weight), 0),
         COALESCE(SUM(weight) FILTER (WHERE status = 'done'), 0)
    INTO v_total, v_done
    FROM construction_milestones
   WHERE project_id = v_project AND status <> 'skipped';

  IF v_total = 0 THEN RETURN NULL; END IF;
  v_pct := ROUND((v_done / v_total) * 100);

  UPDATE construction_projects
     SET progress_pct = v_pct,
         status = CASE
           WHEN v_pct >= 100 AND status IN ('planning','tendering','awarded','in_progress','on_hold')
             THEN 'completed'::construction_status
           ELSE status END,
         actual_completion = CASE
           WHEN v_pct >= 100 AND actual_completion IS NULL THEN CURRENT_DATE
           WHEN v_pct < 100 THEN NULL
           ELSE actual_completion END
   WHERE id = v_project;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER construction_ms_recalc
  AFTER INSERT OR UPDATE OR DELETE ON construction_milestones
  FOR EACH ROW EXECUTE FUNCTION construction_recalc_progress();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE construction_projects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_updates    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS construction_projects_select ON construction_projects;
CREATE POLICY construction_projects_select ON construction_projects FOR SELECT
  USING (is_super_admin() OR is_admin() OR owner_id = auth.uid() OR created_by = auth.uid());
DROP POLICY IF EXISTS construction_projects_write ON construction_projects;
CREATE POLICY construction_projects_write ON construction_projects FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS construction_ms_select ON construction_milestones;
CREATE POLICY construction_ms_select ON construction_milestones FOR SELECT
  USING (is_super_admin() OR is_admin()
         OR project_id IN (SELECT id FROM construction_projects WHERE owner_id = auth.uid() OR created_by = auth.uid()));
DROP POLICY IF EXISTS construction_ms_write ON construction_milestones;
CREATE POLICY construction_ms_write ON construction_milestones FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS construction_upd_select ON construction_updates;
CREATE POLICY construction_upd_select ON construction_updates FOR SELECT
  USING (is_super_admin() OR is_admin()
         OR project_id IN (SELECT id FROM construction_projects WHERE owner_id = auth.uid() OR created_by = auth.uid()));
DROP POLICY IF EXISTS construction_upd_write ON construction_updates;
CREATE POLICY construction_upd_write ON construction_updates FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

REVOKE ALL ON construction_projects, construction_milestones, construction_updates FROM anon, authenticated;
GRANT SELECT ON construction_projects, construction_milestones, construction_updates TO authenticated;
GRANT ALL ON construction_projects, construction_milestones, construction_updates TO service_role;
