import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatPrice, resolveImage, isRental, LISTING_META } from '../_components/types'

// The listing page itself is a client component, so without this layout a
// crawler — or WhatsApp building a link preview — sees only a loading
// skeleton. This server layout loads the listing once to give every page
// its own title, description, share image and structured data.

// /property-portal/[id] is a catch-all, and on property.czaah.com every
// unknown path is rewritten into it. Listing ids are UUIDs; anything else is
// a genuine 404.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Row = {
  id: string
  title: string
  listing_type: string
  property_type: string | null
  price: number | null
  currency: string
  rent_period: 'month' | 'year' | null
  location: string | null
  city: string | null
  country: string | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  description: string | null
  images: string[] | null
}

/** `null` = no such approved listing; `undefined` = lookup failed (don't 404). */
const getListing = cache(async (id: string): Promise<Row | null | undefined> => {
  try {
    const { data, error } = await createAdminClient()
      .from('property_listings')
      .select('id, title, listing_type, property_type, price, currency, rent_period, location, city, country, bedrooms, bathrooms, area_sqft, description, images')
      .eq('id', id)
      .eq('status', 'approved')
      .maybeSingle()
    if (error) return undefined
    return (data as Row) ?? null
  } catch {
    return undefined
  }
})

function place(p: Row) {
  return [p.location, p.city, p.country].filter(Boolean).join(', ')
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  if (!UUID.test(id)) return {}
  const p = await getListing(id)
  if (!p) return {}

  const price = formatPrice(p)
  const label = LISTING_META[p.listing_type]?.label ?? ''
  const title = `${p.title} — ${price}`
  const facts = [
    label,
    p.bedrooms != null ? (p.bedrooms === 0 ? 'Studio' : `${p.bedrooms} bed`) : null,
    p.area_sqft != null ? `${p.area_sqft.toLocaleString()} ft²` : null,
    place(p),
  ].filter(Boolean).join(' · ')
  const text = (p.description || '').replace(/\s+/g, ' ').trim()
  // Cut at a word boundary so previews don't end mid-word.
  const summary = text.length > 160 ? `${text.slice(0, 160).replace(/\s+\S*$/, '')}…` : text
  const description = summary ? `${facts}. ${summary}` : facts
  const image = resolveImage(p.images?.[0])

  return {
    title: `${title} | CZAAH Property`,
    description,
    alternates: { canonical: `/${p.id}` },
    openGraph: {
      title,
      description,
      url: `/${p.id}`,
      siteName: 'CZAAH Property',
      type: 'website',
      ...(image ? { images: [{ url: image, alt: p.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function ListingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const p = await getListing(id)
  // Withdrawn / unapproved / never existed: a real 404, not an empty page.
  if (p === null) notFound()

  // schema.org data so search engines can read the listing without running JS.
  const jsonLd = p
    ? {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: p.title,
        url: `https://property.czaah.com/${p.id}`,
        description: p.description || undefined,
        image: (p.images || []).map((i) => resolveImage(i)).filter(Boolean),
        about: {
          '@type': p.property_type === 'residential' ? 'Residence' : 'Place',
          address: {
            '@type': 'PostalAddress',
            streetAddress: p.location || undefined,
            addressLocality: p.city || undefined,
            addressCountry: p.country || undefined,
          },
        },
        ...(p.price
          ? {
              offers: {
                '@type': 'Offer',
                price: p.price,
                priceCurrency: p.currency,
                businessFunction: isRental(p)
                  ? 'http://purl.org/goodrelations/v1#LeaseOut'
                  : 'http://purl.org/goodrelations/v1#Sell',
                ...(isRental(p)
                  ? {
                      priceSpecification: {
                        '@type': 'UnitPriceSpecification',
                        price: p.price,
                        priceCurrency: p.currency,
                        unitCode: p.rent_period === 'year' ? 'ANN' : 'MON',
                      },
                    }
                  : {}),
              },
            }
          : {}),
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON.stringify output with "<" escaped cannot break out of the tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      {children}
    </>
  )
}
