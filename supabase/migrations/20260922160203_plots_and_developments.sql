-- Plots / land, multi-unit developments and relational payment plans.
--
-- Entirely additive. property_listings keeps every existing column, check
-- constraint and row untouched:
--
--   * property_type keeps its asset-class vocabulary (residential, commercial,
--     industrial, land, mixed_use). The portal's type filters, the allocator
--     and the UK SDLT residential-vs-commercial split all key off it, so
--     widening it would silently drop existing listings out of those paths.
--   * The finer taxonomy the brief asks for (house, flat, room, commercial
--     unit, plot, farm, new development) lands in the NEW property_subtype
--     column. Existing rows keep NULL and behave exactly as before.

-- ── property_listings: subtype + plot detail ─────────────────────────────
ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS property_subtype   TEXT,
  ADD COLUMN IF NOT EXISTS province_state     TEXT,
  ADD COLUMN IF NOT EXISTS address            TEXT,
  ADD COLUMN IF NOT EXISTS latitude           NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude          NUMERIC,
  ADD COLUMN IF NOT EXISTS plot_size          NUMERIC,
  ADD COLUMN IF NOT EXISTS plot_size_unit     TEXT,
  ADD COLUMN IF NOT EXISTS plot_category      TEXT,
  ADD COLUMN IF NOT EXISTS development_name   TEXT,
  ADD COLUMN IF NOT EXISTS developer_name     TEXT,
  ADD COLUMN IF NOT EXISTS marketing_agent    TEXT,
  ADD COLUMN IF NOT EXISTS block              TEXT,
  ADD COLUMN IF NOT EXISTS sector             TEXT,
  ADD COLUMN IF NOT EXISTS plot_number        TEXT,
  ADD COLUMN IF NOT EXISTS price_type         TEXT,
  ADD COLUMN IF NOT EXISTS possession_status   TEXT,
  ADD COLUMN IF NOT EXISTS development_status  TEXT,
  ADD COLUMN IF NOT EXISTS corner_plot        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS park_facing        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS main_road          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS boulevard          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS canal_facing       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approval_authority TEXT,
  ADD COLUMN IF NOT EXISTS featured           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified           BOOLEAN NOT NULL DEFAULT FALSE;

-- Each check is added separately and guarded, so re-running is safe and one
-- failure cannot roll back the whole vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_listings_property_subtype_check') THEN
    ALTER TABLE property_listings ADD CONSTRAINT property_listings_property_subtype_check
      CHECK (property_subtype IS NULL OR property_subtype IN
        ('house', 'flat', 'room', 'commercial_unit', 'plot', 'farm', 'new_development'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_listings_plot_size_unit_check') THEN
    ALTER TABLE property_listings ADD CONSTRAINT property_listings_plot_size_unit_check
      CHECK (plot_size_unit IS NULL OR plot_size_unit IN
        ('marla', 'kanal', 'sq_ft', 'sq_yd', 'sq_m', 'acre'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_listings_plot_category_check') THEN
    ALTER TABLE property_listings ADD CONSTRAINT property_listings_plot_category_check
      CHECK (plot_category IS NULL OR plot_category IN
        ('residential', 'commercial', 'agricultural', 'industrial', 'farmhouse'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_listings_possession_status_check') THEN
    ALTER TABLE property_listings ADD CONSTRAINT property_listings_possession_status_check
      CHECK (possession_status IS NULL OR possession_status IN
        ('ready', 'possession_available', 'balloted', 'non_balloted', 'under_development'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_listings_development_status_check') THEN
    ALTER TABLE property_listings ADD CONSTRAINT property_listings_development_status_check
      CHECK (development_status IS NULL OR development_status IN
        ('launched', 'under_development', 'completed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_listings_plot_size_positive') THEN
    ALTER TABLE property_listings ADD CONSTRAINT property_listings_plot_size_positive
      CHECK (plot_size IS NULL OR plot_size > 0);
  END IF;
END $$;

-- ── developments ─────────────────────────────────────────────────────────
-- One row per scheme. Several plot sizes inside a scheme are units, not
-- duplicated development records.
CREATE TABLE IF NOT EXISTS developments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  developer_name    TEXT,
  marketing_agent   TEXT,
  description       TEXT,
  country           TEXT NOT NULL,
  province_state    TEXT,
  city              TEXT NOT NULL,
  area              TEXT,
  address           TEXT,
  latitude          NUMERIC,
  longitude         NUMERIC,
  approval_status   TEXT,
  approval_authority TEXT,
  featured_image    TEXT,
  gallery           TEXT[] NOT NULL DEFAULT '{}',
  features          TEXT[] NOT NULL DEFAULT '{}',
  currency          TEXT NOT NULL DEFAULT 'PKR',
  development_status TEXT,
  possession_status  TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',
  featured          BOOLEAN NOT NULL DEFAULT FALSE,
  verified          BOOLEAN NOT NULL DEFAULT FALSE,
  agent_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT developments_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT developments_development_status_check
    CHECK (development_status IS NULL OR development_status IN
      ('launched', 'under_development', 'completed')),
  CONSTRAINT developments_possession_status_check
    CHECK (possession_status IS NULL OR possession_status IN
      ('ready', 'possession_available', 'balloted', 'non_balloted', 'under_development'))
);

-- ── development_units (plot variants) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS development_units (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  development_id      UUID NOT NULL REFERENCES developments(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  property_type       TEXT NOT NULL DEFAULT 'land',
  property_subtype    TEXT,
  plot_size           NUMERIC,
  plot_size_unit      TEXT,
  plot_category       TEXT,
  bedrooms            INT,
  bathrooms           INT,
  area_sqft           NUMERIC,
  total_price         NUMERIC,
  currency            TEXT NOT NULL DEFAULT 'PKR',
  availability_status TEXT NOT NULL DEFAULT 'available',
  possession_status   TEXT,
  block               TEXT,
  sector              TEXT,
  plot_number         TEXT,
  corner_plot         BOOLEAN NOT NULL DEFAULT FALSE,
  park_facing         BOOLEAN NOT NULL DEFAULT FALSE,
  main_road           BOOLEAN NOT NULL DEFAULT FALSE,
  boulevard           BOOLEAN NOT NULL DEFAULT FALSE,
  canal_facing        BOOLEAN NOT NULL DEFAULT FALSE,
  description         TEXT,
  images              TEXT[] NOT NULL DEFAULT '{}',
  display_order       INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT development_units_property_type_check
    CHECK (property_type IN ('residential', 'commercial', 'industrial', 'land', 'mixed_use')),
  CONSTRAINT development_units_property_subtype_check
    CHECK (property_subtype IS NULL OR property_subtype IN
      ('house', 'flat', 'room', 'commercial_unit', 'plot', 'farm', 'new_development')),
  CONSTRAINT development_units_plot_size_unit_check
    CHECK (plot_size_unit IS NULL OR plot_size_unit IN
      ('marla', 'kanal', 'sq_ft', 'sq_yd', 'sq_m', 'acre')),
  CONSTRAINT development_units_plot_category_check
    CHECK (plot_category IS NULL OR plot_category IN
      ('residential', 'commercial', 'agricultural', 'industrial', 'farmhouse')),
  CONSTRAINT development_units_availability_check
    CHECK (availability_status IN ('available', 'reserved', 'sold', 'unavailable')),
  CONSTRAINT development_units_possession_status_check
    CHECK (possession_status IS NULL OR possession_status IN
      ('ready', 'possession_available', 'balloted', 'non_balloted', 'under_development')),
  CONSTRAINT development_units_plot_size_positive
    CHECK (plot_size IS NULL OR plot_size > 0),
  CONSTRAINT development_units_price_positive
    CHECK (total_price IS NULL OR total_price > 0)
);

-- Link a standalone listing to a development (optional).
ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS development_id      UUID REFERENCES developments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS development_unit_id UUID REFERENCES development_units(id) ON DELETE SET NULL;

-- ── payment plans ────────────────────────────────────────────────────────
-- A plan belongs to EITHER a standalone listing OR a development unit, never
-- both and never neither — otherwise an orphan plan can never be rendered.
CREATE TABLE IF NOT EXISTS property_payment_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id         UUID REFERENCES property_listings(id) ON DELETE CASCADE,
  development_unit_id UUID REFERENCES development_units(id) ON DELETE CASCADE,
  name                TEXT NOT NULL DEFAULT 'Payment plan',
  total_price         NUMERIC,
  down_payment        NUMERIC,
  currency            TEXT NOT NULL DEFAULT 'PKR',
  duration_months     INT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_plan_one_owner CHECK (
    (property_id IS NOT NULL AND development_unit_id IS NULL) OR
    (property_id IS NULL AND development_unit_id IS NOT NULL)
  ),
  CONSTRAINT payment_plan_amounts_non_negative CHECK (
    (total_price IS NULL OR total_price >= 0) AND
    (down_payment IS NULL OR down_payment >= 0)
  )
);

CREATE TABLE IF NOT EXISTS property_payment_installments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_plan_id     UUID NOT NULL REFERENCES property_payment_plans(id) ON DELETE CASCADE,
  installment_number  INT,
  label               TEXT,
  amount              NUMERIC NOT NULL DEFAULT 0,
  additional_amount   NUMERIC NOT NULL DEFAULT 0,
  due_after_months    INT,
  display_order       INT NOT NULL DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT installment_amounts_non_negative
    CHECK (amount >= 0 AND additional_amount >= 0)
);

-- ── indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_properties_country       ON property_listings(country);
CREATE INDEX IF NOT EXISTS idx_properties_type          ON property_listings(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_subtype       ON property_listings(property_subtype);
CREATE INDEX IF NOT EXISTS idx_properties_listing_type  ON property_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_properties_price         ON property_listings(price);
CREATE INDEX IF NOT EXISTS idx_properties_plot_size     ON property_listings(plot_size);
CREATE INDEX IF NOT EXISTS idx_properties_development   ON property_listings(development_id);
CREATE INDEX IF NOT EXISTS idx_properties_dev_unit      ON property_listings(development_unit_id);
-- The portal's own query shape: approved rows in the listed countries, newest first.
CREATE INDEX IF NOT EXISTS idx_properties_status_country_created
  ON property_listings(status, country, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_developments_status      ON developments(status);
CREATE INDEX IF NOT EXISTS idx_developments_country     ON developments(country);
CREATE INDEX IF NOT EXISTS idx_developments_city        ON developments(city);
CREATE INDEX IF NOT EXISTS idx_developments_agent       ON developments(agent_id);
CREATE INDEX IF NOT EXISTS idx_developments_created_by  ON developments(created_by);

CREATE INDEX IF NOT EXISTS idx_dev_units_development    ON development_units(development_id);
CREATE INDEX IF NOT EXISTS idx_dev_units_availability   ON development_units(availability_status);
CREATE INDEX IF NOT EXISTS idx_dev_units_plot_size      ON development_units(plot_size);

CREATE INDEX IF NOT EXISTS idx_payment_plans_property   ON property_payment_plans(property_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_unit       ON property_payment_plans(development_unit_id);
CREATE INDEX IF NOT EXISTS idx_installments_plan        ON property_payment_installments(payment_plan_id);

-- ── updated_at triggers (same helper the rest of the schema uses) ────────
DROP TRIGGER IF EXISTS set_updated_at ON developments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON developments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON development_units;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON development_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON property_payment_plans;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON property_payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON property_payment_installments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON property_payment_installments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Public sees published developments and everything hanging off them.
-- The owning agent sees and manages their own. Admins see everything.
ALTER TABLE developments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_units             ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_payment_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_payment_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS developments_select_published ON developments;
CREATE POLICY developments_select_published ON developments
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS developments_select_own ON developments;
CREATE POLICY developments_select_own ON developments
  FOR SELECT USING (agent_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS developments_admin_all ON developments;
CREATE POLICY developments_admin_all ON developments
  FOR ALL USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS developments_write_own ON developments;
CREATE POLICY developments_write_own ON developments
  FOR UPDATE USING (agent_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (agent_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS dev_units_select ON development_units;
CREATE POLICY dev_units_select ON development_units
  FOR SELECT USING (
    development_id IN (SELECT id FROM developments WHERE status = 'published')
    OR development_id IN (SELECT id FROM developments WHERE agent_id = auth.uid() OR created_by = auth.uid())
    OR is_super_admin() OR is_admin()
  );

DROP POLICY IF EXISTS dev_units_admin_all ON development_units;
CREATE POLICY dev_units_admin_all ON development_units
  FOR ALL USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS dev_units_write_own ON development_units;
CREATE POLICY dev_units_write_own ON development_units
  FOR ALL USING (
    development_id IN (SELECT id FROM developments WHERE agent_id = auth.uid() OR created_by = auth.uid())
  ) WITH CHECK (
    development_id IN (SELECT id FROM developments WHERE agent_id = auth.uid() OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS payment_plans_select ON property_payment_plans;
CREATE POLICY payment_plans_select ON property_payment_plans
  FOR SELECT USING (
    property_id IN (SELECT id FROM property_listings WHERE status = 'approved')
    OR development_unit_id IN (
      SELECT u.id FROM development_units u
      JOIN developments d ON d.id = u.development_id
      WHERE d.status = 'published'
    )
    OR property_id IN (SELECT id FROM property_listings WHERE partner_id = auth.uid())
    OR development_unit_id IN (
      SELECT u.id FROM development_units u
      JOIN developments d ON d.id = u.development_id
      WHERE d.agent_id = auth.uid() OR d.created_by = auth.uid()
    )
    OR is_super_admin() OR is_admin()
  );

DROP POLICY IF EXISTS payment_plans_admin_all ON property_payment_plans;
CREATE POLICY payment_plans_admin_all ON property_payment_plans
  FOR ALL USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS installments_select ON property_payment_installments;
CREATE POLICY installments_select ON property_payment_installments
  FOR SELECT USING (
    payment_plan_id IN (SELECT id FROM property_payment_plans)
  );

DROP POLICY IF EXISTS installments_admin_all ON property_payment_installments;
CREATE POLICY installments_admin_all ON property_payment_installments
  FOR ALL USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

GRANT ALL ON developments                  TO authenticated, service_role;
GRANT ALL ON development_units             TO authenticated, service_role;
GRANT ALL ON property_payment_plans        TO authenticated, service_role;
GRANT ALL ON property_payment_installments TO authenticated, service_role;
GRANT SELECT ON developments                  TO anon;
GRANT SELECT ON development_units             TO anon;
GRANT SELECT ON property_payment_plans        TO anon;
GRANT SELECT ON property_payment_installments TO anon;
