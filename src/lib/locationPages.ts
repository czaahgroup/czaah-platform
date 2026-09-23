import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadLocationTree } from '@/lib/propertyLocations'
import { resolveLocation, locationLabel, type ResolvedLocation, type Section } from '@/app/property-portal/_components/locationNav'
import { portalMetadata } from '@/app/property-portal/_components/seo'

// Server side of /buy/<country>/<city> and /rent/<country>/<city>.

const TYPES: Record<Section, string[]> = {
  buy: ['sale', 'off_plan'],
  rent: ['rent', 'lease'],
}

/**
 * `undefined` = the location tables could not be read (render the page, don't
 * 404 a real market because of a blip); `null` = no such active location.
 */
export async function loadRouteLocation(countrySlug: string, citySlug?: string): Promise<ResolvedLocation | null | undefined> {
  const tree = await loadLocationTree()
  if (!tree) return undefined
  return resolveLocation(tree, countrySlug, citySlug)
}

/** Live listings for the section in that location. */
async function countListings(section: Section, loc: ResolvedLocation): Promise<number | null> {
  try {
    let q = createAdminClient()
      .from('property_listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .in('listing_type', TYPES[section])
      .ilike('country', loc.country.name)
    if (loc.city) q = q.ilike('city', loc.city.name)
    const { count, error } = await q
    return error ? null : count ?? 0
  } catch {
    return null
  }
}

export async function locationPageMetadata(section: Section, loc: ResolvedLocation | null | undefined, path: string): Promise<Metadata> {
  if (!loc) return {}
  const place = locationLabel(loc)
  const count = await countListings(section, loc)
  const title = section === 'buy' ? `Property for Sale in ${place}` : `Property to Rent in ${place}`
  const description =
    section === 'buy'
      ? `Homes, commercial property, plots and new developments for sale in ${place}, listed with CZAAH Properties.`
      : `Apartments, houses and commercial space to rent in ${place}, listed with CZAAH Properties.`
  // A location with nothing to show still works for visitors but is kept out
  // of search results — no thin, empty landing pages.
  return portalMetadata({ path, title, description, noindex: count === 0 })
}
