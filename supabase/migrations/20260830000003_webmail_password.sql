-- Webmail login: a per-mailbox password so someone can sign in at
-- czaah.com/webmail with just their address + password (no CZAAH account).
-- NULL = webmail login disabled for that mailbox. Hash format is
-- pbkdf2$<iterations>$<salt_b64>$<hash_b64> (see src/lib/webmailAuth.ts).

ALTER TABLE partner_mailboxes ADD COLUMN IF NOT EXISTS webmail_password_hash TEXT;
