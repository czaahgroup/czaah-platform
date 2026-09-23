-- Re-resolve location links after the hierarchy itself changes (a city is
-- added, renamed or removed). Only rows whose links would change are
-- touched. Returns how many listings and developments were updated.
CREATE OR REPLACE FUNCTION resync_property_locations(OUT listings_updated INT, OUT developments_updated INT)
LANGUAGE plpgsql AS $$
BEGIN
  WITH r AS (
    SELECT l.id, x.o_country_id, x.o_city_id, x.o_area_id
    FROM property_listings l, resolve_property_location(l.country, l.city, l.location) x
    WHERE l.country_id IS DISTINCT FROM x.o_country_id
       OR l.city_id IS DISTINCT FROM x.o_city_id
       OR l.area_id IS DISTINCT FROM x.o_area_id
  )
  UPDATE property_listings l
     SET country_id = r.o_country_id, city_id = r.o_city_id, area_id = r.o_area_id
    FROM r WHERE l.id = r.id;
  GET DIAGNOSTICS listings_updated = ROW_COUNT;

  WITH r AS (
    SELECT d.id, x.o_country_id, x.o_city_id, x.o_area_id
    FROM developments d, resolve_property_location(d.country, d.city, d.area) x
    WHERE d.country_id IS DISTINCT FROM x.o_country_id
       OR d.city_id IS DISTINCT FROM x.o_city_id
       OR d.area_id IS DISTINCT FROM x.o_area_id
  )
  UPDATE developments d
     SET country_id = r.o_country_id, city_id = r.o_city_id, area_id = r.o_area_id
    FROM r WHERE d.id = r.id;
  GET DIAGNOSTICS developments_updated = ROW_COUNT;
END $$;

-- Only the service role (the admin API) may run it.
REVOKE ALL ON FUNCTION resync_property_locations() FROM PUBLIC, anon, authenticated;
