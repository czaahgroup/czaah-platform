-- Partner edits to a listing that is already live. The approved listing stays
-- on the site exactly as it is; the proposed values wait here until a super
-- admin accepts them (they are then copied onto the listing) or turns them
-- down (the note is kept for the partner to read).
--
-- A separate table rather than a column on property_listings: listings are
-- publicly readable once approved, and a proposed price must not be.

CREATE TABLE IF NOT EXISTS property_listing_changes (
  listing_id   UUID PRIMARY KEY REFERENCES property_listings(id) ON DELETE CASCADE,
  changes      JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rejected')),
  note         TEXT,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS property_listing_changes_status_idx ON property_listing_changes (status);

-- Service role only: every read and write goes through the API.
ALTER TABLE property_listing_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON property_listing_changes FROM anon, authenticated;
