-- Align the bucket's limit with what storage will actually accept.
--
-- The bucket was set to 100MB, but a project-level "upload file size limit"
-- sits above every bucket and was still at the 50MB default — so a 51MB upload
-- was issued a signed URL, transferred, and only then rejected with
-- EntityTooLarge. Measured empirically: 49MB accepted, 51MB refused.
--
-- Claiming 100MB here would keep telling people they can upload something that
-- cannot land. Raise the project limit first (Supabase dashboard → Storage →
-- Settings → Upload file size limit; the Pro plan allows up to 50GB), then
-- raise this to match.
UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50MB
WHERE id = 'property-images';
