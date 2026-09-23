// Verification of listings and developments (Phase 10). A public "Verified"
// badge means an admin has recorded completing every REQUIRED check below —
// the About page explains exactly that, so the two must stay in step.

export const VERIFICATION_CHECKS = [
  { key: 'identity', label: 'Identity of the owner, landlord or developer confirmed', required: true },
  { key: 'ownership', label: 'Ownership, title or development approval documents seen', required: true },
  { key: 'details', label: 'Price, size and location confirmed with the owner or developer', required: true },
  { key: 'site_visit', label: 'Property or site visited in person', required: false },
] as const
export type CheckKey = (typeof VERIFICATION_CHECKS)[number]['key']
export const REQUIRED_CHECKS = VERIFICATION_CHECKS.filter((c) => c.required).map((c) => c.key)

export type VerifyTarget = 'listing' | 'development'
export const TARGET_TABLE: Record<VerifyTarget, 'property_listings' | 'developments'> = {
  listing: 'property_listings',
  development: 'developments',
}

/** Validate a verify / unverify request from the admin page. */
export function cleanVerification(body: unknown):
  | { error: string }
  | { target: VerifyTarget; id: string; verified: boolean; checks: Record<CheckKey, boolean> | null; notes: string | null } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const target = b.target as VerifyTarget
  if (target !== 'listing' && target !== 'development') return { error: 'Unknown item type.' }
  if (typeof b.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(b.id)) return { error: 'Missing item.' }
  const notes = typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim().slice(0, 2000) : null
  if (b.verified !== true) return { target, id: b.id, verified: false, checks: null, notes }

  const raw = (b.checks && typeof b.checks === 'object' ? b.checks : {}) as Record<string, unknown>
  const checks = Object.fromEntries(VERIFICATION_CHECKS.map((c) => [c.key, raw[c.key] === true])) as Record<CheckKey, boolean>
  const missing = VERIFICATION_CHECKS.filter((c) => c.required && !checks[c.key])
  if (missing.length) return { error: `Before verifying, confirm: ${missing.map((c) => c.label.toLowerCase()).join('; ')}.` }
  if (!notes) return { error: 'Add a note of what was checked (document names, who you spoke to, dates).' }
  return { target, id: b.id, verified: true, checks, notes }
}
