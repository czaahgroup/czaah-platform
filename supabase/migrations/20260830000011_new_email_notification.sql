-- ============================================================
-- P1 — notify on new inbound email
-- ============================================================
-- Fires for every inbound mailbox_messages row (written by either the
-- Cloudflare Email Worker or the Resend mail-inbound function). Notifies
-- the mailbox's owning partner; for a team mailbox (no partner) it notifies
-- every super_admin. Reuses the existing 'new_message' notification type.

CREATE OR REPLACE FUNCTION notify_new_inbound_email()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_profile UUID;
  v_address TEXT;
BEGIN
  IF NEW.direction <> 'inbound' THEN
    RETURN NEW;
  END IF;

  SELECT pr.profile_id, mb.address
    INTO v_owner_profile, v_address
  FROM partner_mailboxes mb
  LEFT JOIN partners pr ON pr.id = mb.partner_id
  WHERE mb.id = NEW.mailbox_id;

  IF v_owner_profile IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link, is_read)
    VALUES (
      v_owner_profile, 'new_message',
      'New email',
      coalesce(NEW.subject, '(no subject)') || ' — from ' || coalesce(NEW.from_address, 'unknown'),
      '/partner-network/mail', FALSE
    );
  ELSE
    INSERT INTO notifications (user_id, type, title, body, link, is_read)
    SELECT p.id, 'new_message',
           'New email to ' || coalesce(v_address, 'a mailbox'),
           coalesce(NEW.subject, '(no subject)') || ' — from ' || coalesce(NEW.from_address, 'unknown'),
           '/admin/mail', FALSE
    FROM profiles p WHERE p.role = 'super_admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_new_inbound_email ON mailbox_messages;
CREATE TRIGGER notify_new_inbound_email
  AFTER INSERT ON mailbox_messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_inbound_email();
