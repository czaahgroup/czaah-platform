import type { SearchSection } from '@/lib/listingSearch'

// Saved-search email alerts: turning a stored search path back into the
// section, location and filters its page applies, and deciding which
// listings count as "new" since the last alert.

export interface ParsedSearch {
  section: SearchSection
  countrySlug?: string
  citySlug?: string
  params: URLSearchParams
}

/** '/property-portal/buy/pakistan/lahore?type=land' → section, slugs, params. */
export function parseSearchPath(path: string): ParsedSearch | null {
  const m = path.match(/^\/property-portal\/(buy|rent|listings|off-plan)(?:\/([a-z0-9-]+))?(?:\/([a-z0-9-]+))?(?:\?(.*))?$/)
  if (!m) return null
  const section = m[1] as SearchSection
  // Only Buy and Rent have location paths.
  if ((m[2] || m[3]) && section !== 'buy' && section !== 'rent') return null
  return { section, countrySlug: m[2], citySlug: m[3], params: new URLSearchParams(m[4] || '') }
}

/** When a listing went live: approval if recorded, else creation. */
export function listedAt(p: { created_at?: string | null; approved_at?: string | null }): number {
  const t = Math.max(p.created_at ? Date.parse(p.created_at) : 0, p.approved_at ? Date.parse(p.approved_at) : 0)
  return Number.isFinite(t) ? t : 0
}

/** Listings that went live after the search's last alert (or after it was saved). */
export function newSince<T extends { created_at?: string | null; approved_at?: string | null }>(
  listings: T[],
  search: { last_alerted_at: string | null; created_at: string },
): T[] {
  const since = Date.parse(search.last_alerted_at || search.created_at)
  return listings.filter((p) => listedAt(p) > since)
}

export const ALERT_MAX_LISTINGS = 6
