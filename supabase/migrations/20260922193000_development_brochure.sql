-- A downloadable brochure (usually the developer's PDF) on a development.
ALTER TABLE developments
  ADD COLUMN IF NOT EXISTS brochure_url  TEXT,
  ADD COLUMN IF NOT EXISTS brochure_name TEXT;

-- The media bucket now also carries the brochure. PDFs only, alongside the
-- image and video types already allowed.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf'
    ]
WHERE id = 'property-images';
