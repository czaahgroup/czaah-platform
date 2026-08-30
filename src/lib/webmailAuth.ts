/**
 * Webmail auth — a lightweight per-mailbox password + signed session cookie so
 * a team member can sign in at /webmail with just their @czaah.com address and
 * a password (set by a super_admin in Admin → Mailboxes). No Supabase account.
 *
 * Password hashing: PBKDF2-SHA256 via Web Crypto (works in the Node and
 * Cloudflare Workers runtimes, no dependency).
 * Session token: <payload_b64url>.<hmac_b64url>, HMAC-SHA256 keyed off
 * SUPABASE_SERVICE_ROLE_KEY (server-only; the token grants no more than that
 * key already can). 7-day expiry.
 */

const PBKDF2_ITERATIONS = 210_000
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60
export const WEBMAIL_COOKIE = 'czaah_webmail'

const enc = new TextEncoder()

function b64urlFromBytes(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function bytesFromB64url(s: string): Uint8Array {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ---- password hashing --------------------------------------------------

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  )
  return b64urlFromBytes(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64urlFromBytes(salt)}$${hash}`
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false
  const [scheme, iterStr, saltB64, hashB64] = stored.split('$')
  if (scheme !== 'pbkdf2' || !iterStr || !saltB64 || !hashB64) return false
  const got = await pbkdf2(password, bytesFromB64url(saltB64), parseInt(iterStr, 10))
  return timingSafeEqual(got, hashB64)
}

// ---- session token ----------------------------------------------------

function sessionSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing — cannot sign webmail sessions')
  return `webmail:${s}`
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(sessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return b64urlFromBytes(sig)
}

export async function signWebmailSession(mailboxId: string, address: string): Promise<string> {
  const payload = b64urlFromBytes(
    enc.encode(JSON.stringify({ m: mailboxId, a: address, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }))
  )
  return `${payload}.${await hmac(payload)}`
}

export async function verifyWebmailSession(
  token: string | undefined | null
): Promise<{ mailboxId: string; address: string } | null> {
  if (!token || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  if (!timingSafeEqual(sig, await hmac(payload))) return null
  try {
    const obj = JSON.parse(new TextDecoder().decode(bytesFromB64url(payload)))
    if (!obj.m || !obj.a || typeof obj.exp !== 'number') return null
    if (obj.exp < Math.floor(Date.now() / 1000)) return null
    return { mailboxId: obj.m, address: obj.a }
  } catch {
    return null
  }
}

export const WEBMAIL_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
}
