-- Fix: profile-referencing FKs on the new partner network tables had no
-- ON DELETE behavior, so deleting/purging any account that had sent a
-- partner message, uploaded a document, reviewed an opportunity, or
-- created a partner would fail with a foreign key violation. Message/
-- document/opportunity history is preserved (SET NULL), not deleted.

ALTER TABLE partner_messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE partner_messages DROP CONSTRAINT partner_messages_sender_id_fkey;
ALTER TABLE partner_messages ADD CONSTRAINT partner_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE partner_opportunity_documents DROP CONSTRAINT partner_opportunity_documents_uploaded_by_fkey;
ALTER TABLE partner_opportunity_documents ADD CONSTRAINT partner_opportunity_documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE partner_opportunities DROP CONSTRAINT partner_opportunities_reviewed_by_fkey;
ALTER TABLE partner_opportunities ADD CONSTRAINT partner_opportunities_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE partner_opportunities DROP CONSTRAINT partner_opportunities_sector_id_fkey;
ALTER TABLE partner_opportunities ADD CONSTRAINT partner_opportunities_sector_id_fkey
  FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE SET NULL;

ALTER TABLE partners DROP CONSTRAINT partners_created_by_fkey;
ALTER TABLE partners ADD CONSTRAINT partners_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
