// CZAAH Properties buyer accounts (Phase 8).
//
// A buyer is a plain Supabase login with NO profiles row: the member system
// treats profiles.status = 'approved' as "approved CZAAH member" in ~20 places
// (member card, investments, broadcasts…), so buyers are kept out of it
// entirely. What a buyer owns — saved_properties, saved_searches — is keyed on
// auth.uid() alone.
//
// Confirmation and password-reset links carry Supabase's token hash to
// property.czaah.com/account, where the page calls verifyOtp itself. That
// keeps the session on the property host without depending on Supabase's
// redirect allowlist (which only lists czaah.com).

export const BUYER_ACCOUNT_TYPE = 'buyer'
export const PASSWORD_MIN = 8

export interface BuyerRegistration {
  full_name: string
  email: string
  password: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function cleanRegistration(body: unknown): { data?: BuyerRegistration; error?: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const full_name = text(b.full_name)
  const email = text(b.email).toLowerCase()
  const password = typeof b.password === 'string' ? b.password : ''
  if (!full_name || full_name.length > 200) return { error: 'Please enter your name.' }
  if (!EMAIL_RE.test(email) || email.length > 254) return { error: 'Please enter a valid email address.' }
  if (password.length < PASSWORD_MIN) return { error: `Your password needs at least ${PASSWORD_MIN} characters.` }
  if (password.length > 200) return { error: 'That password is too long.' }
  return { data: { full_name, email, password } }
}

/** Where account links point: the clean property host, or the folder path elsewhere. */
export function accountUrl(host: string | null, origin: string) {
  return host === 'property.czaah.com' ? 'https://property.czaah.com/account' : `${origin}/property-portal/account`
}

export function accountLink(base: string, kind: 'confirm' | 'reset', tokenHash: string) {
  return `${base}?${kind}=${encodeURIComponent(tokenHash)}`
}

/**
 * A short readable name for a saved search, from its URL: the section and
 * place from the path, then the filters that matter most.
 */
export function savedSearchName(pathname: string, search: string) {
  const parts = pathname.replace(/^\/property-portal/, '').split('/').filter(Boolean)
  const section = parts[0] === 'rent' ? 'To rent' : parts[0] === 'buy' ? 'For sale' : parts[0] === 'off-plan' ? 'Off-plan' : 'Properties'
  const place = parts.slice(1).map((p) => p.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
  const q = new URLSearchParams(search)
  const bits = [section, ...place.reverse()]
  const type = q.get('type')
  if (type) bits.push(type.replace(/_/g, ' '))
  const market = q.get('market')
  if (market && market !== 'all') bits.push(market.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
  if (q.get('beds')) bits.push(`${q.get('beds')}+ beds`)
  const price = q.get('price')
  if (price) {
    const [lo, hi] = price.split('-').map((n) => (n && n !== '0' ? `$${Number(n).toLocaleString('en-GB')}` : ''))
    bits.push(lo && hi ? `${lo}–${hi}` : hi ? `up to ${hi}` : `${lo}+`)
  }
  if (q.get('search')) bits.push(`“${q.get('search')!.slice(0, 40)}”`)
  if (q.get('with_yield')) bits.push('with a stated yield')
  return bits.join(' · ').slice(0, 120)
}

/** Only portal search pages may be saved, as a same-site relative path. */
export function cleanSearchPath(path: unknown): string | null {
  if (typeof path !== 'string' || path.length > 1000) return null
  if (!/^\/property-portal\/(buy|rent|listings|off-plan|new-projects)(\/[a-z0-9-]+){0,2}(\?[^#\s]*)?$/.test(path)) return null
  return path
}
