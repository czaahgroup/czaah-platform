-- The minerals directory on czaah.com/sectors/minerals speaks of supply,
-- joint ventures, licences and investment-ready projects, in seven
-- categories. An offer now says which kind it is, and uses those categories.
ALTER TABLE mineral_offers
  ADD COLUMN IF NOT EXISTS offer_type TEXT NOT NULL DEFAULT 'supply'
    CHECK (offer_type IN ('supply', 'joint_venture', 'licence', 'investment'));

ALTER TABLE mineral_offers DROP CONSTRAINT IF EXISTS mineral_offers_category_check;
ALTER TABLE mineral_offers
  ADD CONSTRAINT mineral_offers_category_check
  CHECK (category IN ('precious_metal', 'base_metal', 'energy', 'industrial', 'gemstone', 'dimension_stone', 'rare_earth', 'other'));

ALTER TABLE mineral_rfqs ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'quote'
  CHECK (kind IN ('quote', 'opportunity', 'sourcing'));
