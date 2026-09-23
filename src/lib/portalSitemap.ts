import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadPortalContent } from '@/lib/portalContent'
import { logError } from '@/lib/logError'
import { DESTINATIONS, type Destination } from '@/app/property-portal/_components/destinations'

const BASE = 'https://property.czaah.com'

// Indexable portal pages. /saved is per-visitor and deliberately absent.
const STATIC_PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },
  { path: '/buy', priority: 0.9, changeFrequency: 'daily' },
  { path: '/rent', priority: 0.9, changeFrequency: 'daily' },
  { path: '/off-plan', priority: 0.9, changeFrequency: 'daily' },
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

  const content = await loadPortalContent()
  const countries = content.settings.countries
  const destinations = (Array.isArray(content.destinations) && content.destinations.length
    ? content.destinations
    : DESTINATIONS) as Destination[]

  for (const d of destinations) {
    if (!d?.slug) continue
    entries.push({ url: `${BASE}/destinations/${d.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 })
  }

  try {
    const supabase = createAdminClient()
    const [listings, developments] = await Promise.all([
      supabase
        .from('property_listings')
        .select('id, updated_at')
        .eq('status', 'approved')
        .in('country', countries)
        .order('updated_at', { ascending: false })
        .limit(5000),
      supabase
        .from('developments')
        .select('slug, updated_at')
        .eq('status', 'published')
        .limit(1000),
    ])

    for (const l of listings.data || []) {
      entries.push({ url: `${BASE}/${l.id}`, lastModified: new Date(l.updated_at), changeFrequency: 'weekly', priority: 0.8 })
    }
    for (const d of developments.data || []) {
      entries.push({ url: `${BASE}/developments/${d.slug}`, lastModified: new Date(d.updated_at), changeFrequency: 'weekly', priority: 0.8 })
    }
    if (listings.error) logError('lib.portalSitemap', listings.error, { step: 'listings' })
    if (developments.error) logError('lib.portalSitemap', developments.error, { step: 'developments' })
  } catch (err) {
    logError('lib.portalSitemap', err)
  }

  return entries
}
