-- Phase 4.3: market-specific listing fields (brief §5) and the source of any
-- yield figure (brief §8). All nullable and additive — existing listings and
-- every current form are unaffected; a field only appears where it is set.

-- United Kingdom
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS tenure TEXT
  CHECK (tenure IS NULL OR tenure IN ('freehold', 'leasehold', 'share_of_freehold', 'commonhold'));
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS lease_years_remaining INT
  CHECK (lease_years_remaining IS NULL OR lease_years_remaining BETWEEN 1 AND 9999);
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS council_tax_band TEXT
  CHECK (council_tax_band IS NULL OR council_tax_band IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'));
-- Annual amounts, in the listing's own currency.
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS service_charge NUMERIC
  CHECK (service_charge IS NULL OR service_charge >= 0);
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS ground_rent NUMERIC
  CHECK (ground_rent IS NULL OR ground_rent >= 0);

-- New build vs resale (UK), ready vs off-plan already lives in listing_type.
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS build_status TEXT
  CHECK (build_status IS NULL OR build_status IN ('new_build', 'resale'));

-- Dubai / off-plan
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS completion_date DATE;

-- Pakistan: housing society and phase (block / sector / plot_number exist).
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS society TEXT;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS phase TEXT;

-- Where a yield figure comes from. The portal labels the figure with it and
-- calls an unlabelled one "seller-stated" — never a bare "yield".
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS yield_source TEXT
  CHECK (yield_source IS NULL OR yield_source IN ('estimated', 'historical', 'developer_supplied', 'third_party'));

CREATE INDEX IF NOT EXISTS idx_property_listings_society ON property_listings(society) WHERE society IS NOT NULL;
