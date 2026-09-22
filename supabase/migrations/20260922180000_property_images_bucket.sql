-- A public bucket for property and development marketing images.
--
-- Portal images were being written to `platform-files`, which is PRIVATE, while
-- resolveImage() builds `/storage/v1/object/public/platform-files/…` URLs. Every
-- such URL returns "Bucket not found", so the first development with uploaded
-- artwork rendered four broken images. Nothing had caught it because every
-- listing so far used external (Unsplash) URLs, so no portal image had ever
-- actually come from storage.
--
-- `platform-files` must stay private — it also holds partner deal documents,
-- investment documents, enquiry attachments and chat files. Marketing images get
-- their own bucket instead, which is the only thing that should be world-readable.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  TRUE,
  -- 10 MB. Large enough for a developer's advert scan, small enough that an
  -- unoptimised camera original gets rejected rather than served to phones.
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public = TRUE,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Reads on a public bucket are served without RLS, but an explicit policy keeps
-- the intent visible to anyone reading the schema.
DROP POLICY IF EXISTS property_images_public_read ON storage.objects;
CREATE POLICY property_images_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');

-- Writes stay closed to anon: uploads go through the admin and partner APIs,
-- which use the service role and bypass RLS entirely.
DROP POLICY IF EXISTS property_images_admin_write ON storage.objects;
CREATE POLICY property_images_admin_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND (is_super_admin() OR is_admin()));
