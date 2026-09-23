-- Phase 0 security (property audit, 2026-09-23).
--
-- 1. Record schema drift. These exist in production but no migration created
--    them, so a database rebuilt from this repo would break the portal
--    (LISTING_COLUMNS selects both columns; two listings are 'off_plan').
--    All statements are idempotent against the live database.
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS yield_percentage NUMERIC;

ALTER TABLE property_listings DROP CONSTRAINT IF EXISTS property_listings_listing_type_check;
ALTER TABLE property_listings ADD CONSTRAINT property_listings_listing_type_check
  CHECK (listing_type IN ('sale', 'rent', 'lease', 'off_plan'));

-- 2. Listings: an owner may only ever create or edit a listing in review.
--    Before this, the INSERT policy checked ownership alone, so any signed-in
--    account could insert straight into the table with the public key as
--    status 'approved' and featured — live on the portal, skipping review.
--    The app itself writes through the service role and is unaffected.
DROP POLICY IF EXISTS properties_insert ON property_listings;
CREATE POLICY properties_insert ON property_listings
  FOR INSERT WITH CHECK (
    partner_id = auth.uid()
    AND status = 'pending'
    AND COALESCE(featured, false) = false
    AND COALESCE(verified, false) = false
    AND approved_by IS NULL
    AND approved_at IS NULL
  );

-- The old UPDATE policy fell back to its USING clause for the new row, which
-- kept status 'pending' but let an owner switch on featured / verified while
-- a listing waited for review.
DROP POLICY IF EXISTS properties_update_own ON property_listings;
CREATE POLICY properties_update_own ON property_listings
  FOR UPDATE
  USING (partner_id = auth.uid() AND status = 'pending')
  WITH CHECK (
    partner_id = auth.uid()
    AND status = 'pending'
    AND COALESCE(featured, false) = false
    AND COALESCE(verified, false) = false
    AND approved_by IS NULL
    AND approved_at IS NULL
  );

-- 3. Property chat messages: the sender must be a participant in the chat.
--    Before, only sender_id was checked, so any signed-in account could post
--    into any conversation.
DROP POLICY IF EXISTS pmsg_insert ON property_messages;
CREATE POLICY pmsg_insert ON property_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND (
      chat_id IN (
        SELECT id FROM property_chats
        WHERE enquirer_id = auth.uid() OR partner_id = auth.uid()
      )
      OR is_super_admin()
    )
  );
