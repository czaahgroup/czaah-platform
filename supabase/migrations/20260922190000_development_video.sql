-- Video on a development, and room in the media bucket to store it.
--
-- property_listings has carried video_url / video_poster_url since the portal
-- redesign; developments had no equivalent, so a scheme could only ever be
-- shown as stills.

ALTER TABLE developments
  ADD COLUMN IF NOT EXISTS video_url        TEXT,
  ADD COLUMN IF NOT EXISTS video_poster_url TEXT;

-- The bucket was created for images only. It now takes the site-visit clips
-- that go alongside them, so it needs the video types and a larger ceiling.
-- The name stays `property-images` deliberately: it is already wired into
-- resolveImage(), both upload paths and four live files, and renaming it to
-- chase tidiness is exactly how the last round of broken images happened.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ],
    -- 100 MB. The API uploads are base64 over JSON, so the admin UI refuses
    -- anything much smaller than this well before the bucket would.
    file_size_limit = 104857600
WHERE id = 'property-images';
