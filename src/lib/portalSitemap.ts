import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadPortalContent } from '@/lib/portalContent'
import { logError } from '@/lib/logError'
import { DESTINATIONS, type Destination } from '@/app/property-portal/_components/destinations'
import { loadLocationTree, activeCountryNames } from '@/lib/propertyLocations'

const BASE = 'https://property.czaah.com'

// Indexable portal pages. /saved is per-visitor and deliberately absent.
const STATIC_PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },
  { path: '/buy', priority: 0.9, changeFrequency: 'daily' },
  { path: '/rent', priority: 0.9, changeFrequency: 'daily' },
  { path: '/off-plan', priority: 0.9, changeFrequency: 'daily' },
  { path: '/new-projects', priority: 0.9, changeFrequency: 'daily' },
  { path: '/investments', priority: 0.8, changeFrequency: 'daily' },
  { path: '/developers', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/listings', priority: 0.8, changeFrequency: 'daily' },
  { path: '/destinations', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/sell', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/allocator', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/insights', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
]

/**
 * The property.czaah.com sitemap: real pages plus every live listing,
 * development and destination. Listings are limited to the countries the
 * portal actually shows, so hidden markets do not leak into search results.
 * A failed lookup still returns the static pages rather than an error.
 */
export async function portalSitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))

  const [content, tree] = await Promise.all([loadPortalContent(), loadLocationTree()])
  // Admin → Locations decides the live markets and cities; the older
  // settings/destination lists only apply if those tables are unreadable.
  const countries = tree && activeCountryNames(tree).length ? activeCountryNames(tree) : content.settings.countries
  const destinations: Pick<Destination, 'slug'>[] = tree
    ? tree.flatMap((r) => r.countries.flatMap((c) => c.cities.map((ci) => ({ slug: ci.slug }))))
    : ((Array.isArray(content.destinations) && content.destinations.length ? content.destinations : DESTINATIONS) as Destination[])

  for (const d of destinations) {
    if (!d?.slug) continue
    entries.push({ url: `${BASE}/destinations/${d.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 })
  }

  try {
    const supabase = createAdminClient()
    const [listings, developments] = await Promise.all([
      supabase
        .from('property_listings')
        .select('id, updated_at, country, city, listing_type')
        .eq('status', 'approved')
        .in('country', countries)
        .order('updated_at', { ascending: false })
        .limit(5000),
      supabase
        .from('developments')
        .select('slug, updated_at, country, developer_id')
        .eq('status', 'published')
        .in('country', countries)
        .limit(1000),
    ])
    const { data: developers } = await supabase.from('property_developers').select('id, slug, updated_at').eq('active', true)

    for (const l of listings.data || []) {
      entries.push({ url: `${BASE}/${l.id}`, lastModified: new Date(l.updated_at), changeFrequency: 'weekly', priority: 0.8 })
    }

    // /buy/<country>[/<city>] and /rent/… — only where something is listed,
    // so the sitemap never points search engines at an empty page.
    if (tree) {
      const pages = new Set<string>()
      for (const l of listings.data || []) {
        const section = l.listing_type === 'rent' || l.listing_type === 'lease' ? 'rent' : 'buy'
        const country = tree.flatMap((r) => r.countries).find((c) => c.name.toLowerCase() === String(l.country || '').toLowerCase())
        if (!country) continue
        pages.add(`/${section}/${country.slug}`)
        const city = country.cities.find((c) => c.name.toLowerCase() === String(l.city || '').trim().toLowerCase())
        if (city) pages.add(`/${section}/${country.slug}/${city.slug}`)
      }
      for (const p of [...pages].sort()) {
        entries.push({ url: `${BASE}${p}`, lastModified: now, changeFrequency: 'daily', priority: p.split('/').length > 3 ? 0.8 : 0.85 })
      }
    }
    for (const d of developments.data || []) {
      entries.push({ url: `${BASE}/developments/${d.slug}`, lastModified: new Date(d.updated_at), changeFrequency: 'weekly', priority: 0.8 })
    }
    // Developer pages and /new-projects/<country>, only where there are projects.
    const withProjects = new Set((developments.data || []).map((d) => d.developer_id).filter(Boolean))
    for (const dv of developers || []) {
      if (withProjects.has(dv.id)) entries.push({ url: `${BASE}/developers/${dv.slug}`, lastModified: new Date(dv.updated_at), changeFrequency: 'weekly', priority: 0.6 })
    }
    if (tree) {
      const projectCountries = new Set((developments.data || []).map((d) => String(d.country || '').toLowerCase()))
      for (const c of tree.flatMap((r) => r.countries)) {
        if (projectCountries.has(c.name.toLowerCase())) entries.push({ url: `${BASE}/new-projects/${c.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 })
      }
    }
    if (listings.error) logError('lib.portalSitemap', listings.error, { step: 'listings' })
    if (developments.error) logError('lib.portalSitemap', developments.error, { step: 'developments' })
  } catch (err) {
    logError('lib.portalSitemap', err)
  }

  return entries
}
