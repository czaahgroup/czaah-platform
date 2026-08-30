-- ============================================
-- TEAM MAILBOXES
-- Allow partner_mailboxes rows with no partner_id — "team" addresses
-- (info@, support@, ahmed@ …) created and worked by super_admin from
-- /admin/mail. Inbound routing (czaah-mail-worker) and outbound sending
-- (Resend) key off `address` only, so nothing else needs to change.
-- The existing UNIQUE(partner_id) still prevents a duplicate mailbox for
-- the same partner; SQL allows any number of NULLs.
-- ============================================

ALTER TABLE partner_mailboxes ALTER COLUMN partner_id DROP NOT NULL;
