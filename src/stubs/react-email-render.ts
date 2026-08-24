// Stub for @react-email/render, aliased in next.config.ts.
// The real package pulls in prettier (~250KB) purely to pretty-print rendered
// HTML, which pushed the Cloudflare Worker bundle over the 3 MiB size limit.
// Nothing in this app renders React email templates (resend/client.ts only
// sends plain HTML strings) — resend's internal render() helper reaches for
// this package via a try/caught dynamic import, so this stub only needs to
// fail the same way the real package does when it's genuinely missing.
export function render(): never {
  throw new Error(
    'Failed to render React component. Make sure to install `@react-email/render` or `@react-email/components`.'
  );
}

export function renderAsync(): never {
  return render();
}
