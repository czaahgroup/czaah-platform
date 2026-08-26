// Stub for svix, aliased in next.config.ts.
// resend's SDK statically imports svix's Webhook class (~3MB unbundled) purely
// for its `resend.webhooks.verify()` helper — signature verification for
// incoming Resend webhook events. This app never receives or verifies
// webhooks (see src/lib/resend/client.ts: it only calls resend.emails.send()),
// so this stub only needs to fail the same way the real package would if it
// were genuinely missing, the same approach as src/stubs/react-email-render.ts.
export class Webhook {
  constructor() {
    throw new Error('svix is not installed — webhook verification is not supported in this app.')
  }
}
