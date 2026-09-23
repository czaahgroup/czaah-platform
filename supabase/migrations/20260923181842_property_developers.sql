-- Phase 6: developers (brief §10). Developer → projects (developments) → units.
--
-- Additive, same pattern as the location hierarchy: developments and listings
-- keep their free-text developer_name; a nullable developer_id links them to
-- the new table, kept in step by a trigger, so no existing form changes.
-- One developer can work in many countries (many-to-many).

CREATE TABLE IF NOT EXISTS property_developers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL UNIQUE,
  slug                TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url            TEXT,
  description         TEXT,
  website             TEXT,
  email               TEXT,
  phone               TEXT,
  -- Only an admin sets this; the portal shows a badge for 'verified' only.
  verification_status TEXT NOT NULL DEFAULT 'unverified'
                      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected', 'expired')),
  verified_at         TIMESTAMPTZ,
  verified_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verification_notes  TEXT,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_developer_countries (
  developer_id UUID NOT NULL REFERENCES property_developers(id) ON DELETE CASCADE,
  country_id   UUID NOT NULL REFERENCES property_countries(id) ON DELETE CASCADE,
  PRIMARY KEY (developer_id, country_id)
);
CREATE INDEX IF NOT EXISTS idx_developer_countries_country ON property_developer_countries(country_id);

DROP TRIGGER IF EXISTS trg_property_developers_updated ON property_developers;
CREATE TRIGGER trg_property_developers_updated BEFORE UPDATE ON property_developers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE property_developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_developer_countries ENABLE ROW LEVEL SECURITY;
-- Public reads active developers (verification notes are never selected by
-- the public API); writes go through the admin API with the service role.
DROP POLICY IF EXISTS property_developers_read ON property_developers;
CREATE POLICY property_developers_read ON property_developers FOR SELECT
  USING (active OR is_admin() OR is_super_admin());
DROP POLICY IF EXISTS property_developer_countries_read ON property_developer_countries;
CREATE POLICY property_developer_countries_read ON property_developer_countries FOR SELECT USING (true);

ALTER TABLE developments      ADD COLUMN IF NOT EXISTS developer_id UUID REFERENCES property_developers(id) ON DELETE SET NULL;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS developer_id UUID REFERENCES property_developers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_developments_developer_id ON developments(developer_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_developer_id ON property_listings(developer_id);

-- Link by name, case- and space-insensitive; an unmatched name stays NULL.
CREATE OR REPLACE FUNCTION resolve_property_developer(p_name TEXT) RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT id FROM property_developers
  WHERE p_name IS NOT NULL AND lower(btrim(name)) = lower(btrim(p_name))
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION sync_developer_link() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.developer_id := resolve_property_developer(NEW.developer_name);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_development_developer ON developments;
CREATE TRIGGER trg_development_developer BEFORE INSERT OR UPDATE OF developer_name ON developments
  FOR EACH ROW EXECUTE FUNCTION sync_developer_link();
DROP TRIGGER IF EXISTS trg_listing_developer ON property_listings;
CREATE TRIGGER trg_listing_developer BEFORE INSERT OR UPDATE OF developer_name ON property_listings
  FOR EACH ROW EXECUTE FUNCTION sync_developer_link();

-- Relink after developers themselves change (added / renamed / removed).
CREATE OR REPLACE FUNCTION resync_property_developers(OUT developments_updated INT, OUT listings_updated INT)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE developments d SET developer_id = resolve_property_developer(d.developer_name)
   WHERE d.developer_id IS DISTINCT FROM resolve_property_developer(d.developer_name);
  GET DIAGNOSTICS developments_updated = ROW_COUNT;
  UPDATE property_listings l SET developer_id = resolve_property_developer(l.developer_name)
   WHERE l.developer_id IS DISTINCT FROM resolve_property_developer(l.developer_name);
  GET DIAGNOSTICS listings_updated = ROW_COUNT;
END $$;
REVOKE ALL ON FUNCTION resync_property_developers() FROM PUBLIC, anon, authenticated;

-- Seed: the one developer the data actually names. Unverified — nothing has
-- been checked yet, and the portal must not imply otherwise.
INSERT INTO property_developers (name, slug)
VALUES ('Citi Housing', 'citi-housing')
ON CONFLICT (name) DO NOTHING;

INSERT INTO property_developer_countries (developer_id, country_id)
SELECT d.id, c.id FROM property_developers d, property_countries c
WHERE d.slug = 'citi-housing' AND c.country_code = 'PK'
ON CONFLICT DO NOTHING;

SELECT * FROM resync_property_developers();
