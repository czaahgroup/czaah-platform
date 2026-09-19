-- Per-project video for the property portal.
--
-- The portal hero plays one clip per market (London / Dubai / Pakistan). This
-- lets an individual listing carry its own footage, which the hero and the
-- detail page prefer over the market clip when present.
--
-- Stored as a URL rather than a file: hero video must be a direct, seekable
-- MP4 for autoplay to work, and Cloudflare Workers caps a served asset at
-- 25 MiB — so clips live in storage or on a CDN and are referenced here.
--
-- Additive and nullable: existing rows are unaffected and continue to fall
-- back to their market's clip.

ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_poster_url TEXT;

COMMENT ON COLUMN property_listings.video_url IS
  'Direct MP4 URL for this project. Must be H.264/AAC, muted-autoplay friendly, and ideally under ~5MB. Falls back to the market clip when null.';

COMMENT ON COLUMN property_listings.video_poster_url IS
  'Still frame shown while the video loads, and the only thing shown under prefers-reduced-motion. Falls back to the listing''s first image when null.';
