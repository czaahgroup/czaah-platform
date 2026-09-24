/**
 * Guards for files that arrive as base64 in a JSON body.
 *
 * Storage paths are built as `<folder>/<id>/<name>`, so a caller-supplied name
 * like "../<other-id>/x.pdf" must never reach them, and a caller-declared
 * content type must never be trusted as-is for a public bucket.
 */

/** Image types a listing photo may be stored as (served from a PUBLIC bucket). */
export const LISTING_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

/** Per-image cap for listing photos. */
export const LISTING_IMAGE_MAX_BYTES = 10 * 1024 * 1024

/** Most photos one partner listing may carry. */
export const PARTNER_MAX_PHOTOS = 20

/**
 * Where a partner's browser uploads listing photos. The create route only
 * accepts paths under the caller's own prefix, so one partner can never
 * attach another's files.
 */
export const PARTNER_UPLOAD_PREFIX = (userId: string) => `properties/${userId}/uploads/`

/**
 * A storage-safe file name: no directory parts, no traversal, no control or
 * shell-hostile characters, bounded length, extension kept.
 */
export function safeFileName(name: unknown, fallback = 'file'): string {
  const base = String(name ?? '')
    .split(/[\\/]/)
    .pop()!
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^\w.\- ()]+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\s]+/, '')
    .trim()
  if (!base) return fallback
  if (base.length <= 120) return base
  const dot = base.lastIndexOf('.')
  const ext = dot > 0 && base.length - dot <= 10 ? base.slice(dot) : ''
  return base.slice(0, 120 - ext.length) + ext
}

/** Decoded size of a base64 payload, without decoding it. */
export function base64Bytes(b64: string): number {
  const clean = b64.replace(/\s/g, '')
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  return Math.floor((clean.length * 3) / 4) - padding
}

/**
 * Sniffs the real image type from its first bytes. The data-URL header is
 * chosen by the caller, so it is only a hint.
 */
export function sniffImageType(buf: Uint8Array): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf.length >= 12 && String.fromCharCode(...buf.slice(0, 4)) === 'RIFF' && String.fromCharCode(...buf.slice(8, 12)) === 'WEBP') return 'image/webp'
  if (buf.length >= 12 && String.fromCharCode(...buf.slice(4, 8)) === 'ftyp' && /^avi[fs]$/.test(String.fromCharCode(...buf.slice(8, 12)))) return 'image/avif'
  return null
}
