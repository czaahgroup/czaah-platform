-- Phase 4.2: owner / developer / partner submissions from property.czaah.com/sell.
--
-- Submissions never touch property_listings directly and are never public: an
-- admin reviews each one and can convert it into a (pending) listing. Private
-- table — RLS on, no policies — read and written only by the service role
-- through the submission and admin APIs.

CREATE SEQUENCE IF NOT EXISTS property_submission_ref_seq START 1001;

CREATE TABLE IF NOT EXISTS property_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       TEXT NOT NULL UNIQUE DEFAULT ('SUB-' || nextval('property_submission_ref_seq')),
  kind            TEXT NOT NULL CHECK (kind IN ('sell', 'let', 'development', 'partnership')),
  status          TEXT NOT NULL DEFAULT 'pending_review'
                  CHECK (status IN ('pending_review', 'contacted', 'approved', 'converted', 'rejected', 'spam')),

  -- Contact
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  company         TEXT,

  -- The property (sell / let)
  country         TEXT,
  city            TEXT,
  address         TEXT,
  property_type   TEXT,
  bedrooms        INT CHECK (bedrooms IS NULL OR bedrooms BETWEEN 0 AND 50),
  bathrooms       INT CHECK (bathrooms IS NULL OR bathrooms BETWEEN 0 AND 50),
  size_value      NUMERIC CHECK (size_value IS NULL OR size_value > 0),
  size_unit       TEXT CHECK (size_unit IS NULL OR size_unit IN ('sq_ft', 'sq_m', 'marla', 'kanal', 'sq_yd', 'acre')),
  currency        TEXT,
  expected_price  NUMERIC CHECK (expected_price IS NULL OR expected_price >= 0),
  expected_rent   NUMERIC CHECK (expected_rent IS NULL OR expected_rent >= 0),
  rent_period     TEXT CHECK (rent_period IS NULL OR rent_period IN ('month', 'year')),
  available_from  DATE,
  furnishing      TEXT CHECK (furnishing IS NULL OR furnishing IN ('furnished', 'part_furnished', 'unfurnished')),
  timeline        TEXT,

  -- Developments / partnerships
  development_name TEXT,
  developer_name   TEXT,
  units_count      INT CHECK (units_count IS NULL OR units_count > 0),
  completion       TEXT,
  website          TEXT,
  partner_type     TEXT CHECK (partner_type IS NULL OR partner_type IN ('agent', 'developer', 'other')),
  markets          TEXT,

  message         TEXT,
  -- Storage paths in the PRIVATE platform-files bucket (submissions/<id>/…).
  images          TEXT[] NOT NULL DEFAULT '{}',

  -- Review
  admin_notes     TEXT,
  reviewed_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  listing_id      UUID REFERENCES property_listings(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_submissions_status ON property_submissions(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_property_submissions_updated ON property_submissions;
CREATE TRIGGER trg_property_submissions_updated BEFORE UPDATE ON property_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE property_submissions ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: anon and authenticated clients can do nothing.
REVOKE ALL ON property_submissions FROM anon, authenticated;
REVOKE ALL ON SEQUENCE property_submission_ref_seq FROM anon, authenticated;

-- Schema drift, recorded: in production partner_id is already nullable (CZAAH-
-- direct listings created in admin have no partner), but the original
-- migration declared it NOT NULL. Idempotent against prod.
ALTER TABLE property_listings ALTER COLUMN partner_id DROP NOT NULL;
