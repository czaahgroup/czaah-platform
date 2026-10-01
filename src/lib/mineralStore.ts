import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { PUBLIC_OFFER_COLUMNS, type PublicOffer } from '@/lib/minerals'

/**
 * Server-side reads for minerals.czaah.com. Service role, so every query here
 * restates what is public: approved offers, public columns only.
 */

/** Every approved offer, newest first. Null if the catalogue could not be read. */
export async function loadPublicOffers(): Promise<PublicOffer[] | null> {
  try {
    const { data, error } = await createAdminClient()
      .from('mineral_offers')
      .select(PUBLIC_OFFER_COLUMNS)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as unknown as PublicOffer[]
  } catch (err) {
    logError('lib.mineralStore', err)
    return null
  }
}

/** One approved offer. `null` = no such offer; `undefined` = the lookup failed. */
export async function loadPublicOffer(id: string): Promise<PublicOffer | null | undefined> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
  try {
    const { data, error } = await createAdminClient()
      .from('mineral_offers')
      .select(PUBLIC_OFFER_COLUMNS)
      .eq('id', id)
      .eq('status', 'approved')
      .maybeSingle()
    if (error) throw error
    return (data as unknown as PublicOffer) || null
  } catch (err) {
    logError('lib.mineralStore', err, { id })
    return undefined
  }
}

export async function mineralsSitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://minerals.czaah.com'
  const offers = (await loadPublicOffers()) || []
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/offers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/resources`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/request`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    ...offers.map((o) => ({
      url: `${base}/offers/${o.id}`,
      lastModified: new Date(o.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
