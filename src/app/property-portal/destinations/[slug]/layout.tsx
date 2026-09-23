import type { Metadata } from 'next'
import { loadPortalContent } from '@/lib/portalContent'
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
  const content = await loadPortalContent()
  const list = (Array.isArray(content.destinations) && content.destinations.length
    ? content.destinations
    : DESTINATIONS) as Destination[]
  const d = list.find((x) => x?.slug === slug)

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
