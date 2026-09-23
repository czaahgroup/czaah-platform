import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'

/**
 * The CZAAH Properties location hierarchy: region → country → city → area.
 *
 * Tables: property_regions / property_countries / property_cities /
 * property_areas (migration 20260923150740). Listings and developments keep
 * their free-text country/city/location and are linked to these rows by a
 * database trigger, so nothing here has to be kept in step by hand.
 */

export interface LocationRow {
  id: string
  name: string
  slug: string
  active: boolean
  display_order: number
}
export interface RegionRow extends LocationRow {
  description: string | null
}
export interface CountryRow extends LocationRow {
  region_id: string
  country_code: string
  currency: string
  tagline: string | null
  description: string | null
  image_url: string | null
}
export interface CityRow extends LocationRow {
  country_id: string
  tagline: string | null
  blurb: string | null
  image_url: string | null
}
export interface AreaRow extends LocationRow {
  city_id: string
  postcode_prefix: string | null
}

export interface AreaNode { id: string; name: string; slug: string; postcode_prefix: string | null }
export interface CityNode {
  id: string; name: string; slug: string
  tagline: string | null; blurb: string | null; image_url: string | null
  areas: AreaNode[]
}
export interface CountryNode {
  id: string; name: string; slug: string; code: string; currency: string
  tagline: string | null; description: string | null; image_url: string | null
  cities: CityNode[]
}
export interface RegionNode {
  id: string; name: string; slug: string; description: string | null
  countries: CountryNode[]
}
export type LocationTree = RegionNode[]

export interface LocationRows {
  regions: RegionRow[]
  countries: CountryRow[]
  cities: CityRow[]
  areas: AreaRow[]
}

const byOrder = (a: LocationRow, b: LocationRow) =>
  a.display_order - b.display_order || a.name.localeCompare(b.name)

/**
 * Nests flat rows into the public tree. A node is shown only if it and every
 * ancestor is active — switching off a country hides its cities and areas
 * too. Regions are kept even when they have no active country, so a market
 * that is "coming soon" (Europe beyond the UK, say) can still be presented.
 */
export function buildLocationTree(rows: LocationRows): LocationTree {
  const areasByCity = new Map<string, AreaNode[]>()
  for (const a of [...rows.areas].sort(byOrder)) {
    if (!a.active) continue
    const list = areasByCity.get(a.city_id) || []
    list.push({ id: a.id, name: a.name, slug: a.slug, postcode_prefix: a.postcode_prefix })
    areasByCity.set(a.city_id, list)
  }

  const citiesByCountry = new Map<string, CityNode[]>()
  for (const c of [...rows.cities].sort(byOrder)) {
    if (!c.active) continue
    const list = citiesByCountry.get(c.country_id) || []
    list.push({
      id: c.id, name: c.name, slug: c.slug,
      tagline: c.tagline, blurb: c.blurb, image_url: c.image_url,
      areas: areasByCity.get(c.id) || [],
    })
    citiesByCountry.set(c.country_id, list)
  }

  const countriesByRegion = new Map<string, CountryNode[]>()
  for (const c of [...rows.countries].sort(byOrder)) {
    if (!c.active) continue
    const list = countriesByRegion.get(c.region_id) || []
    list.push({
      id: c.id, name: c.name, slug: c.slug, code: c.country_code, currency: c.currency,
      tagline: c.tagline, description: c.description, image_url: c.image_url,
      cities: citiesByCountry.get(c.id) || [],
    })
    countriesByRegion.set(c.region_id, list)
  }

  return [...rows.regions]
    .sort(byOrder)
    .filter((r) => r.active)
    .map((r) => ({
      id: r.id, name: r.name, slug: r.slug, description: r.description,
      countries: countriesByRegion.get(r.id) || [],
    }))
}

/** Names of the countries the portal shows, as stored on listings. */
export function activeCountryNames(tree: LocationTree | null | undefined): string[] {
  return (tree || []).flatMap((r) => r.countries.map((c) => c.name))
}

/** Reads every location row (active and inactive). Service role — server only. */
export async function loadLocationRows(): Promise<LocationRows | null> {
  try {
    const supabase = createAdminClient()
    const [regions, countries, cities, areas] = await Promise.all([
      supabase.from('property_regions').select('id, name, slug, description, display_order, active'),
      supabase.from('property_countries').select('id, region_id, country_code, name, slug, currency, tagline, description, image_url, display_order, active'),
      supabase.from('property_cities').select('id, country_id, name, slug, tagline, blurb, image_url, display_order, active'),
      supabase.from('property_areas').select('id, city_id, name, slug, postcode_prefix, display_order, active'),
    ])
    const failed = [regions, countries, cities, areas].find((r) => r.error)
    if (failed?.error) {
      // PostgrestError is a plain object; wrap it so the log shows the reason.
      const e = failed.error as { code?: string; message?: string }
      logError('lib.propertyLocations.load', new Error(`${e.code || 'error'}: ${e.message || JSON.stringify(e)}`))
      return null
    }
    return {
      regions: (regions.data || []) as RegionRow[],
      countries: (countries.data || []) as CountryRow[],
      cities: (cities.data || []) as CityRow[],
      areas: (areas.data || []) as AreaRow[],
    }
  } catch (err) {
    logError('lib.propertyLocations.load', err)
    return null
  }
}

/**
 * The public tree, or null if the tables cannot be read — callers then fall
 * back to their shipped defaults rather than showing an empty portal.
 */
export async function loadLocationTree(): Promise<LocationTree | null> {
  const rows = await loadLocationRows()
  return rows ? buildLocationTree(rows) : null
}

/**
 * Server-side market gate for the public APIs: the requested countries,
 * narrowed to the ones that are switched on. Hidden markets used to be hidden
 * only by the browser asking for fewer countries, so any caller could still
 * list them. Null means "could not load the markets" — callers keep the
 * previous behaviour rather than failing.
 */
export async function allowedCountries(requested: string[] | null): Promise<string[] | null> {
  const tree = await loadLocationTree()
  if (!tree) return requested
  const active = activeCountryNames(tree)
  if (!requested || !requested.length) return active
  const wanted = new Set(requested.map((c) => c.trim().toLowerCase()))
  return active.filter((c) => wanted.has(c.toLowerCase()))
}
