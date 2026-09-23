import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveImage } from '../../_components/types'

// The development page is a client component, so without this layout an
// unknown slug answered HTTP 200 with a client-drawn "not found" — a soft 404
// that search engines index. This server layout looks the development up
// once: a missing or unpublished one is a real 404, and a live one gets its
// own title, description and share image.

// slugify() only ever emits these characters; anything else cannot exist.
// (Loose on hyphens: its 80-char cut can leave a trailing one.)
const SLUG = /^[a-z0-9-]{1,100}$/

type Row = {
  name: string
  slug: string
  description: string | null
  developer_name: string | null
  area: string | null
  city: string | null
  country: string | null
  featured_image: string | null
}

/** `null` = no such published development; `undefined` = lookup failed (don't 404). */
const getDevelopment = cache(async (slug: string): Promise<Row | null | undefined> => {
  try {
    const { data, error } = await createAdminClient()
      .from('developments')
      .select('name, slug, description, developer_name, area, city, country, featured_image')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error) return undefined
    return (data as Row) ?? null
  } catch {
    return undefined
  }
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  if (!SLUG.test(slug)) return {}
  const d = await getDevelopment(slug)
  if (!d) return {}

  const place = [d.area, d.city, d.country].filter(Boolean).join(', ')
  const facts = [d.developer_name ? `By ${d.developer_name}` : null, place].filter(Boolean).join(' · ')
  const text = (d.description || '').replace(/\s+/g, ' ').trim()
  // Cut at a word boundary so previews don't end mid-word.
  const summary = text.length > 160 ? `${text.slice(0, 160).replace(/\s+\S*$/, '')}…` : text
  const description = summary ? (facts ? `${facts}. ${summary}` : summary) : facts
  const image = resolveImage(d.featured_image)
  const url = `/developments/${d.slug}`

  return {
    title: `${d.name} | CZAAH Properties`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: d.name,
      description,
      url,
      siteName: 'CZAAH Properties',
      type: 'website',
      ...(image ? { images: [{ url: image, alt: d.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: d.name,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function DevelopmentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!SLUG.test(slug)) notFound()
  // Unpublished / never existed: a real 404. A failed lookup falls through to
  // the client page, which retries via the API rather than 404ing a live page.
  if ((await getDevelopment(slug)) === null) notFound()
  return <>{children}</>
}
