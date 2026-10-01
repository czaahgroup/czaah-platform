-- CZAAH Minerals (minerals.czaah.com): a catalogue of mineral offers and the
-- quote requests buyers send about them.
--
-- An offer is added by an admin (partner_id null = CZAAH direct) or by a
-- partner authorised for Minerals & Mining, and is public only once an admin
-- approves it. "verified" is set by an admin who has seen the assay / licence;
-- has_assay_report and has_export_licence are the SELLER's statements and are
-- labelled as such on the site.

CREATE SEQUENCE IF NOT EXISTS mineral_offer_ref_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS mineral_rfq_ref_seq START 1001;

CREATE TABLE IF NOT EXISTS mineral_offers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference          TEXT NOT NULL UNIQUE DEFAULT ('MIN-' || nextval('mineral_offer_ref_seq')),
  partner_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  commodity          TEXT NOT NULL,
  category           TEXT NOT NULL CHECK (category IN ('metallic_ore', 'industrial_mineral', 'precious_metal', 'gemstone', 'energy_mineral', 'dimension_stone', 'salt', 'other')),
  form               TEXT,
  grade              TEXT,
  origin_country     TEXT NOT NULL,
  origin_region      TEXT,
  quantity_available NUMERIC CHECK (quantity_available IS NULL OR quantity_available > 0),
  quantity_unit      TEXT NOT NULL DEFAULT 'MT',
  min_order          NUMERIC CHECK (min_order IS NULL OR min_order > 0),
  supply_capacity    TEXT,
  price_amount       NUMERIC CHECK (price_amount IS NULL OR price_amount > 0),
  price_currency     TEXT NOT NULL DEFAULT 'USD',
  incoterm           TEXT,
  loading_port       TEXT,
  packaging          TEXT,
  description        TEXT,
  images             TEXT[] NOT NULL DEFAULT '{}',
  has_assay_report   BOOLEAN NOT NULL DEFAULT false,
  has_export_licence BOOLEAN NOT NULL DEFAULT false,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'inactive')),
  rejection_notes    TEXT,
  approved_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at        TIMESTAMPTZ,
  verified           BOOLEAN NOT NULL DEFAULT false,
  verified_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at        TIMESTAMPTZ,
  verification_notes TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mineral_offers_status_idx ON mineral_offers (status, created_at DESC);
CREATE INDEX IF NOT EXISTS mineral_offers_partner_idx ON mineral_offers (partner_id);

CREATE TABLE IF NOT EXISTS mineral_rfqs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        TEXT NOT NULL UNIQUE DEFAULT ('RFQ-' || nextval('mineral_rfq_ref_seq')),
  offer_id         UUID REFERENCES mineral_offers(id) ON DELETE SET NULL,
  offer_reference  TEXT,
  offer_title      TEXT,
  commodity        TEXT,
  name             TEXT NOT NULL,
  company          TEXT,
  email            TEXT NOT NULL,
  phone            TEXT,
  country          TEXT,
  quantity         NUMERIC,
  quantity_unit    TEXT,
  incoterm         TEXT,
  destination_port TEXT,
  message          TEXT,
  status           TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost', 'spam')),
  admin_notes      TEXT,
  contact_id       UUID,
  source_page      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mineral_rfqs_status_idx ON mineral_rfqs (status, created_at DESC);

-- Service role only: every read and write goes through the API, which decides
-- what is public (approved offers, without seller or verification notes).
ALTER TABLE mineral_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mineral_rfqs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mineral_offers, mineral_rfqs FROM anon, authenticated;
REVOKE ALL ON SEQUENCE mineral_offer_ref_seq, mineral_rfq_ref_seq FROM anon, authenticated;
