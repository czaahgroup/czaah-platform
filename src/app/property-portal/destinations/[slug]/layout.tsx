import type { Metadata } from 'next'
import { loadPortalContent } from '@/lib/portalContent'
import { loadLocationTree } from '@/lib/propertyLocations'
import { DESTINATIONS, type Destination } from '../../_components/destinations'
import { portalMetadata } from '../../_components/seo'

// The destination page is a client component, so its metadata lives here.
// A city with no editorial entry still has a page (listings are matched by
// city), so an unknown slug gets a title built from the slug, not a 404.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [content, tree] = await Promise.all([loadPortalContent(), loadLocationTree()])
  const list = (Array.isArray(content.destinations) && content.destinations.length
    ? content.destinations
    : DESTINATIONS) as Destination[]
  const editorial = list.find((x) => x?.slug === slug)
  // Admin → Locations names the city and its country; editorial fills in.
  const located = tree
    ?.flatMap((r) => r.countries.flatMap((c) => c.cities.map((ci) => ({ ci, country: c.name }))))
    .find((x) => x.ci.slug === slug)
  const d = located
    ? { city: located.ci.name, country: located.country, blurb: located.ci.blurb || editorial?.blurb || '' }
    : editorial

  const city = d?.city || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const place = d?.country ? `${city}, ${d.country}` : city
  const blurb = (d?.blurb || '').replace(/\s+/g, ' ').trim()
  const description = blurb
    ? blurb.length > 155 ? `${blurb.slice(0, 155).replace(/\s+\S*$/, '')}…` : blurb
    : `Property to buy, rent and invest in ${city} with CZAAH Properties.`

  return portalMetadata({
    path: `/destinations/${slug}`,
    title: `Property in ${place}`,
    description,
  })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
