-- Phase 3: CZAAH Properties location hierarchy — region → country → city → area.
--
-- Additive only. The free-text country / city / location columns on listings
-- and developments stay exactly as they are; new nullable *_id columns link
-- them to the hierarchy, and a trigger keeps the links in step with the text,
-- so every existing form (admin, partner, seed script) keeps working unchanged.
--
-- `countries` is the GROUP-wide reference table (CRM, deals). Its is_active
-- flag is not ours to repurpose, so a market has its own row here that
-- references it by ISO code.

CREATE TABLE IF NOT EXISTS property_regions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description   TEXT,
  display_order INT NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_countries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id     UUID NOT NULL REFERENCES property_regions(id) ON DELETE RESTRICT,
  country_code  CHAR(2) NOT NULL UNIQUE REFERENCES countries(code) ON DELETE RESTRICT,
  -- Must equal the text used on listings ("United Kingdom"), which is how
  -- existing rows are matched.
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  currency      CHAR(3) NOT NULL,
  tagline       TEXT,
  description   TEXT,
  image_url     TEXT,
  display_order INT NOT NULL DEFAULT 0,
  -- Off = the market is hidden from the portal (listings, search, sitemap).
  active        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_cities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id    UUID NOT NULL REFERENCES property_countries(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  -- Globally unique: city pages live at /destinations/<slug>.
  slug          TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tagline       TEXT,
  blurb         TEXT,
  image_url     TEXT,
  display_order INT NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_id, name)
);

CREATE TABLE IF NOT EXISTS property_areas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id         UUID NOT NULL REFERENCES property_cities(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  postcode_prefix TEXT,
  display_order   INT NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (city_id, slug),
  UNIQUE (city_id, name)
);

CREATE INDEX IF NOT EXISTS idx_property_countries_region ON property_countries(region_id);
CREATE INDEX IF NOT EXISTS idx_property_cities_country ON property_cities(country_id);
CREATE INDEX IF NOT EXISTS idx_property_areas_city ON property_areas(city_id);

DROP TRIGGER IF EXISTS trg_property_regions_updated ON property_regions;
CREATE TRIGGER trg_property_regions_updated BEFORE UPDATE ON property_regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_property_countries_updated ON property_countries;
CREATE TRIGGER trg_property_countries_updated BEFORE UPDATE ON property_countries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_property_cities_updated ON property_cities;
CREATE TRIGGER trg_property_cities_updated BEFORE UPDATE ON property_cities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_property_areas_updated ON property_areas;
CREATE TRIGGER trg_property_areas_updated BEFORE UPDATE ON property_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: the public reads active rows; admins read everything. All writes go
-- through the admin API with the service role, so there are no write policies.
ALTER TABLE property_regions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_cities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_areas     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS property_regions_read ON property_regions;
CREATE POLICY property_regions_read ON property_regions FOR SELECT
  USING (active OR is_admin() OR is_super_admin());
DROP POLICY IF EXISTS property_countries_read ON property_countries;
CREATE POLICY property_countries_read ON property_countries FOR SELECT
  USING (active OR is_admin() OR is_super_admin());
DROP POLICY IF EXISTS property_cities_read ON property_cities;
CREATE POLICY property_cities_read ON property_cities FOR SELECT
  USING (active OR is_admin() OR is_super_admin());
DROP POLICY IF EXISTS property_areas_read ON property_areas;
CREATE POLICY property_areas_read ON property_areas FOR SELECT
  USING (active OR is_admin() OR is_super_admin());

-- Links from listings and developments. Nullable, SET NULL on delete: a
-- location can be removed without touching a listing's own text.
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES property_countries(id) ON DELETE SET NULL;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS city_id    UUID REFERENCES property_cities(id)    ON DELETE SET NULL;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS area_id    UUID REFERENCES property_areas(id)     ON DELETE SET NULL;
ALTER TABLE developments      ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES property_countries(id) ON DELETE SET NULL;
ALTER TABLE developments      ADD COLUMN IF NOT EXISTS city_id    UUID REFERENCES property_cities(id)    ON DELETE SET NULL;
ALTER TABLE developments      ADD COLUMN IF NOT EXISTS area_id    UUID REFERENCES property_areas(id)     ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_property_listings_city_id ON property_listings(city_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_country_id ON property_listings(country_id);
CREATE INDEX IF NOT EXISTS idx_developments_city_id ON developments(city_id);

-- Resolve the links from the free text. Case- and space-insensitive exact
-- matches only: an unmatched city stays NULL (and shows up in the admin
-- Locations screen) rather than being guessed.
CREATE OR REPLACE FUNCTION resolve_property_location(p_country TEXT, p_city TEXT, p_area TEXT,
  OUT o_country_id UUID, OUT o_city_id UUID, OUT o_area_id UUID)
LANGUAGE sql STABLE AS $$
  WITH c AS (
    SELECT id FROM property_countries
    WHERE lower(btrim(name)) = lower(btrim(p_country)) OR country_code = upper(btrim(p_country))
    LIMIT 1
  ), ci AS (
    SELECT id FROM property_cities
    WHERE country_id = (SELECT id FROM c) AND lower(btrim(name)) = lower(btrim(p_city))
    LIMIT 1
  ), a AS (
    SELECT id FROM property_areas
    WHERE city_id = (SELECT id FROM ci) AND lower(btrim(name)) = lower(btrim(p_area))
    LIMIT 1
  )
  SELECT (SELECT id FROM c), (SELECT id FROM ci), (SELECT id FROM a)
$$;

CREATE OR REPLACE FUNCTION sync_listing_location() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM resolve_property_location(NEW.country, NEW.city, NEW.location);
  NEW.country_id := r.o_country_id;
  NEW.city_id := r.o_city_id;
  NEW.area_id := r.o_area_id;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION sync_development_location() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM resolve_property_location(NEW.country, NEW.city, NEW.area);
  NEW.country_id := r.o_country_id;
  NEW.city_id := r.o_city_id;
  NEW.area_id := r.o_area_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_listing_location ON property_listings;
CREATE TRIGGER trg_listing_location BEFORE INSERT OR UPDATE OF country, city, location ON property_listings
  FOR EACH ROW EXECUTE FUNCTION sync_listing_location();
DROP TRIGGER IF EXISTS trg_development_location ON developments;
CREATE TRIGGER trg_development_location BEFORE INSERT OR UPDATE OF country, city, area ON developments
  FOR EACH ROW EXECUTE FUNCTION sync_development_location();

-- Seed: exactly the markets the portal serves today, from real listings. The
-- three shown countries are active; Saudi Arabia and Qatar each have one
-- approved listing but are hidden today, so they start inactive.
INSERT INTO property_regions (name, slug, display_order) VALUES
  ('Europe', 'europe', 1),
  ('Middle East', 'middle-east', 2),
  ('Asia', 'asia', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO property_countries (region_id, country_code, name, slug, currency, display_order, active)
SELECT r.id, v.code, v.name, v.slug, v.currency, v.ord, v.active
FROM (VALUES
  ('europe',      'GB', 'United Kingdom',       'united-kingdom', 'GBP', 1, true),
  ('middle-east', 'AE', 'United Arab Emirates', 'uae',            'AED', 1, true),
  ('middle-east', 'SA', 'Saudi Arabia',         'saudi-arabia',   'SAR', 2, false),
  ('middle-east', 'QA', 'Qatar',                'qatar',          'QAR', 3, false),
  ('asia',        'PK', 'Pakistan',             'pakistan',       'PKR', 1, true)
) AS v(region, code, name, slug, currency, ord, active)
JOIN property_regions r ON r.slug = v.region
ON CONFLICT (country_code) DO NOTHING;

INSERT INTO property_cities (country_id, name, slug, display_order)
SELECT c.id, v.name, v.slug, v.ord
FROM (VALUES
  ('GB', 'London', 'london', 1),
  ('AE', 'Dubai', 'dubai', 1),
  ('PK', 'Islamabad', 'islamabad', 1),
  ('PK', 'Lahore', 'lahore', 2),
  ('PK', 'Karachi', 'karachi', 3),
  ('PK', 'Gwadar', 'gwadar', 4),
  ('PK', 'KPK', 'kpk', 5),
  ('PK', 'Gujranwala', 'gujranwala', 6),
  ('SA', 'Riyadh', 'riyadh', 1),
  ('QA', 'Doha', 'doha', 1)
) AS v(code, name, slug, ord)
JOIN property_countries c ON c.country_code = v.code
ON CONFLICT (slug) DO NOTHING;

INSERT INTO property_areas (city_id, name, slug)
SELECT ci.id, v.name, v.slug
FROM (VALUES
  ('london', 'Canary Wharf', 'canary-wharf'),
  ('london', 'Mayfair', 'mayfair'),
  ('london', 'Nine Elms', 'nine-elms'),
  ('dubai', 'Business Bay', 'business-bay'),
  ('islamabad', 'Blue Area', 'blue-area'),
  ('islamabad', 'F-7 Markaz', 'f-7-markaz'),
  ('karachi', 'Clifton', 'clifton'),
  ('lahore', 'Sundar Industrial Estate', 'sundar-industrial-estate'),
  ('gwadar', 'Gwadar Free Zone', 'gwadar-free-zone'),
  ('kpk', 'Rashakai SEZ', 'rashakai-sez'),
  ('riyadh', 'King Abdullah Financial District', 'king-abdullah-financial-district'),
  ('doha', 'The Pearl', 'the-pearl')
) AS v(city, name, slug)
JOIN property_cities ci ON ci.slug = v.city
ON CONFLICT (city_id, slug) DO NOTHING;

-- Backfill the links on existing rows. Touching the text columns fires the
-- triggers above, which is the same code path every future write takes.
UPDATE property_listings SET country = country;
UPDATE developments SET country = country;
