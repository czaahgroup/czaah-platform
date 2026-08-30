-- Fix the logo in already-saved branded signatures.
-- The old URL (favicon/czaah-shared.png) is the 1200x630 social banner and
-- rendered squished at 42px; swap it for the square 192x192 app icon.
-- Newly generated signatures already use the new URL (src/lib/mailSignature.ts).

UPDATE partner_mailboxes
SET signature_html = REPLACE(
      signature_html,
      'favicon/czaah-shared.png',
      'favicon/web-app-manifest-192x192.png'
    )
WHERE signature_html LIKE '%favicon/czaah-shared.png%';
