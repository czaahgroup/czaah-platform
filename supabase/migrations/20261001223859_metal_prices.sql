-- Spot metal prices shown on minerals.czaah.com. A small cache: the site
-- refreshes it from the price feed at most every 30 minutes, so a page view
-- never depends on the feed being up and the feed is not hit per visitor.
CREATE TABLE IF NOT EXISTS metal_prices (
  symbol            TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  price_usd         NUMERIC NOT NULL CHECK (price_usd > 0),
  unit              TEXT NOT NULL,
  source_updated_at TIMESTAMPTZ,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE metal_prices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON metal_prices FROM anon, authenticated;
