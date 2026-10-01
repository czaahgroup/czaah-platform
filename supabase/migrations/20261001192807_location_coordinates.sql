-- Map search: a centre point for each city and area, used to place a listing
-- on the map when it has no coordinates of its own. Always shown to visitors
-- as an approximate location, never as the property's exact position.

ALTER TABLE property_cities
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE property_areas
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;

ALTER TABLE property_cities
  ADD CONSTRAINT property_cities_coords_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );
ALTER TABLE property_areas
  ADD CONSTRAINT property_areas_coords_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );

-- Centre points from OpenStreetMap (Nominatim), looked up 2026-10-01.
UPDATE property_cities c SET latitude = v.lat, longitude = v.lng
FROM (VALUES
  ('gujranwala', 32.15253, 74.19337),
  ('gwadar',     25.14798, 62.32546),
  ('islamabad',  33.69381, 73.06515),
  ('karachi',    24.85468, 67.02071),
  ('kpk',        33.71280, 71.26788),
  ('lahore',     31.56568, 74.31418),
  ('doha',       25.31088, 51.50818),
  ('riyadh',     24.63892, 46.71601),
  ('dubai',      25.07428, 55.18856),
  ('london',     51.50745, -0.12777)
) AS v(slug, lat, lng)
WHERE c.slug = v.slug AND c.latitude IS NULL;

-- Gwadar Free Zone has no OpenStreetMap entry, so it is left empty and its
-- listings fall back to the Gwadar city centre.
UPDATE property_areas a SET latitude = v.lat, longitude = v.lng
FROM property_cities c, (VALUES
  ('islamabad', 'blue-area',                        33.72205, 73.07879),
  ('islamabad', 'f-7-markaz',                       33.72047, 73.05631),
  ('karachi',   'clifton',                          24.81906, 67.02624),
  ('kpk',       'rashakai-sez',                     34.11230, 72.01989),
  ('lahore',    'sundar-industrial-estate',         31.28635, 74.17361),
  ('doha',      'the-pearl',                        25.36990, 51.55266),
  ('riyadh',    'king-abdullah-financial-district', 24.76570, 46.64071),
  ('dubai',     'business-bay',                     25.17946, 55.26837),
  ('london',    'canary-wharf',                     51.50490, -0.01900),
  ('london',    'mayfair',                          51.51109, -0.14706),
  ('london',    'nine-elms',                        51.48018, -0.12969)
) AS v(city_slug, slug, lat, lng)
WHERE a.city_id = c.id AND c.slug = v.city_slug AND a.slug = v.slug AND a.latitude IS NULL;
