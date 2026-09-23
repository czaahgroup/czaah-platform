/**
 * Only ever redirect to a path on this site.
 *
 * `?redirect=` comes from the address bar, so it is attacker-controlled. The
 * auth callback built `${origin}${redirect}`, which `@evil.com` turned into
 * `https://czaah.com@evil.com` — a link that starts with our domain and lands
 * on someone else's. Anything that is not a plain same-site path becomes the
 * fallback.
 */
export function safeRedirect(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback
  const original = value.trim()
  // Check both the raw and the decoded form (an encoded "//" is still "//"),
  // but hand back the original so a legitimate query keeps its encoding.
  let decoded: string
  try {
    decoded = decodeURIComponent(original)
  } catch {
    return fallback
  }
  for (const path of [original, decoded]) {
    // Must be a root-relative path: "/x", never "//host", "/\host" or "x:".
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback
    if (/[\u0000-\u001f\\]/.test(path)) return fallback
  }
  return original
}
