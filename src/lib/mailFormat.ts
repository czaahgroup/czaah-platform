/**
 * Plain-text / HTML helpers shared by the mail send routes (compose + reply)
 * and the forward action in MailWorkspace. Edge-safe — no Node built-ins.
 */

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
}

/** Best-effort HTML → readable plain text for the `text` part of an outbound email. */
export function htmlToText(html: string): string {
  if (!html) return ''
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<hr\s*\/?>/gi, '\n———\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Append a mailbox's signature to an outbound HTML body. Returns null only when
 * there is neither a body nor a signature (callers then fall back to plain text).
 */
export function appendSignature(bodyHtml: string | null, signatureHtml: string | null | undefined): string | null {
  const body = (bodyHtml || '').trim()
  const sig = (signatureHtml || '').trim()
  if (!body && !sig) return null
  if (!sig) return body
  if (!body) return sig
  return `${body}<br><br>${sig}`
}

/** Gmail-style quoted block for forwarding / including prior context. */
export function buildQuote({
  fromLabel,
  dateLabel,
  bodyHtml,
  bodyText,
}: {
  fromLabel: string
  dateLabel: string
  bodyHtml?: string | null
  bodyText?: string | null
}): string {
  const inner = (bodyHtml && bodyHtml.trim())
    ? bodyHtml
    : `<p>${(bodyText || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`
  return (
    `<br><br>` +
    `<div style="border-left:2px solid #ccc;padding-left:12px;color:#555">` +
    `<p style="margin:0 0 8px;color:#888;font-size:12px">On ${dateLabel}, ${fromLabel} wrote:</p>` +
    inner +
    `</div>`
  )
}
