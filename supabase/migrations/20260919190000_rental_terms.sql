-- Rental terms for the property portal.
--
-- listing_type already allows 'rent' and 'lease', but `price` was only ever
-- meaningful as a purchase price. For a rental it is the periodic rent, so
-- the period has to be stored alongside it — otherwise "USD 4,500" reads as a
-- sale price and pollutes every sale-based calculation.
--
-- All nullable and additive; existing sale / off-plan rows are unaffected.

ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS rent_period TEXT
    CHECK (rent_period IS NULL OR rent_period IN ('month', 'year')),
  ADD COLUMN IF NOT EXISTS furnishing TEXT
    CHECK (furnishing IS NULL OR furnishing IN ('furnished', 'part_furnished', 'unfurnished')),
  ADD COLUMN IF NOT EXISTS available_from DATE,
  ADD COLUMN IF NOT EXISTS deposit NUMERIC,
  ADD COLUMN IF NOT EXISTS min_term_months INTEGER
    CHECK (min_term_months IS NULL OR min_term_months > 0);

COMMENT ON COLUMN property_listings.rent_period IS
  'For rent/lease listings: the period `price` covers. month (UK/PK residential convention) or year (UAE, most commercial).';
COMMENT ON COLUMN property_listings.deposit IS
  'Security deposit, in the listing currency.';
COMMENT ON COLUMN property_listings.min_term_months IS
  'Minimum tenancy / lease term in months.';
