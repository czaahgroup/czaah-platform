-- ============================================================
-- P1E — link mail threads to CRM contacts by address
-- ============================================================
-- A trigger keeps crm_links in sync as inbound mail arrives (works for
-- both the Cloudflare Email Worker and the Resend mail-inbound function,
-- since both insert mailbox_threads rows). Plus a one-time backfill.

CREATE OR REPLACE FUNCTION crm_link_mail_thread()
RETURNS TRIGGER AS $$
DECLARE
  v_contact UUID;
BEGIN
  SELECT id INTO v_contact
  FROM crm_contacts
  WHERE email IS NOT NULL AND lower(email) = lower(NEW.external_address)
  LIMIT 1;

  IF v_contact IS NOT NULL THEN
    INSERT INTO crm_links (source_type, source_id, contact_id)
    VALUES ('mail_thread', NEW.id, v_contact)
    ON CONFLICT DO NOTHING;

    UPDATE crm_contacts
      SET last_activity_at = GREATEST(coalesce(last_activity_at, 'epoch'::timestamptz), NEW.last_message_at)
      WHERE id = v_contact;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS crm_link_mail_thread ON mailbox_threads;
CREATE TRIGGER crm_link_mail_thread
  AFTER INSERT ON mailbox_threads
  FOR EACH ROW EXECUTE FUNCTION crm_link_mail_thread();

-- one-time backfill for threads that already exist
INSERT INTO crm_links (source_type, source_id, contact_id)
SELECT 'mail_thread', t.id, c.id
FROM mailbox_threads t
JOIN crm_contacts c ON c.email IS NOT NULL AND lower(c.email) = lower(t.external_address)
WHERE NOT EXISTS (
  SELECT 1 FROM crm_links l
  WHERE l.source_type = 'mail_thread' AND l.source_id = t.id AND l.contact_id = c.id
);
