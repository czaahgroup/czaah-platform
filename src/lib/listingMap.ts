import type { LocationTree } from '@/lib/propertyLocations'

/**
 * Where a listing goes on the map.
 *
 * A listing with its own coordinates is shown exactly there. Most have none,
 * so they fall back to the centre of their area, then of their city (Admin →
 * Locations). A fallback is a real place but not the property's position, so
 * it carries a precision the map must show — never a pin that pretends to be
 * the front door. Browser-safe: the tree is passed in.
 */

export type MapPrecision = 'exact' | 'area' | 'city'

export interface MapPoint {
  lat: number
  lng: number
  precision: MapPrecision
  /** The place the point stands for, e.g. "Canary Wharf, London". */
  label: string
}

export interface MappableListing {
  id: string
  latitude?: number | string | null
  longitude?: number | string | null
  location?: string | null
  city?: string | null
  country?: string | null
}

export interface MapGroup<T> extends MapPoint {
  key: string
  listings: T[]
}

/** Both numbers present, in range, and not the 0,0 an empty form saves. */
export function validCoords(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (lat == null || lng == null || lat === '' || lng === '') return null
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return null
  if (la === 0 && ln === 0) return null
  return { lat: la, lng: ln }
}

const same = (a: string | null | undefined, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase()

/** The listing's map position, or null when nothing places it. */
export function listingPoint(listing: MappableListing, tree: LocationTree | null | undefined): MapPoint | null {
  const place = [listing.location, listing.city].filter(Boolean).join(', ')
  const own = validCoords(listing.latitude, listing.longitude)
  if (own) return { ...own, precision: 'exact', label: place || listing.country || '' }

  // The same name matching the database trigger uses to link a listing.
  for (const region of tree || []) {
    for (const country of region.countries) {
      if (!same(listing.country, country.name)) continue
      const city = country.cities.find((c) => same(listing.city, c.name))
      if (!city) return null
      const area = city.areas.find((a) => same(listing.location, a.name))
      const areaAt = area && validCoords(area.lat, area.lng)
      if (area && areaAt) return { ...areaAt, precision: 'area', label: `${area.name}, ${city.name}` }
      const cityAt = validCoords(city.lat, city.lng)
      if (cityAt) return { ...cityAt, precision: 'city', label: city.name }
      return null
    }
  }
  return null
}

/**
 * Listings gathered into one marker per position — several listings in the
 * same area share its centre point, and stacked pins would hide all but one.
 * Listings that cannot be placed come back separately so the page can still
 * list them.
 */
export function groupForMap<T extends MappableListing>(
  listings: T[],
  tree: LocationTree | null | undefined,
): { groups: MapGroup<T>[]; unplaced: T[] } {
  const groups = new Map<string, MapGroup<T>>()
  const unplaced: T[] = []
  for (const listing of listings) {
    const point = listingPoint(listing, tree)
    if (!point) {
      unplaced.push(listing)
      continue
    }
    // An exact listing never merges into an approximate group at the same spot.
    const key = `${point.precision === 'exact' ? 'x' : 'a'}:${point.lat.toFixed(5)},${point.lng.toFixed(5)}`
    const group = groups.get(key)
    if (group) group.listings.push(listing)
    else groups.set(key, { ...point, key, listings: [listing] })
  }
  return { groups: [...groups.values()], unplaced }
}

/** How the precision is worded to a visitor. */
export function precisionNote(point: Pick<MapPoint, 'precision' | 'label'>): string {
  if (point.precision === 'exact') return 'Location as supplied for this property.'
  if (point.precision === 'area') return `Approximate location: the map shows the ${point.label} area, not the property's exact position.`
  return `Approximate location: the map shows ${point.label}, not the property's exact position.`
}

/** A short price for a map pin: "GBP 1.25M", "PKR 85M", "AED 950K". */
export function pinPrice(price: number | null | undefined, currency: string | null | undefined): string {
  if (!price || !Number.isFinite(price)) return 'POA'
  const short = (n: number, unit: string) => `${Number(n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2))}${unit}`
  let amount: string
  if (price >= 1e9) amount = short(price / 1e9, 'B')
  else if (price >= 1e6) amount = short(price / 1e6, 'M')
  else if (price >= 1e4) amount = short(price / 1e3, 'K')
  else amount = Math.round(price).toLocaleString('en-GB')
  return currency ? `${currency} ${amount}` : amount
}
