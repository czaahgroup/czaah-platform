import type { Metadata } from 'next'

export const PORTAL_SITE_NAME = 'CZAAH Properties'
const DEFAULT_IMAGE = { url: '/videos/dubai.jpg', alt: PORTAL_SITE_NAME }

/**
 * Metadata for one portal page: a unique title and description, a canonical
 * on the clean property.czaah.com path, and share cards.
 *
 * A page's own `openGraph` replaces the layout's rather than merging with it,
 * so the default share image is set again here — otherwise pages with their
 * own metadata would lose the preview image.
 */
export function portalMetadata(opts: {
  /** Clean path on property.czaah.com, e.g. "/buy". */
  path: string
  /** Page title without the brand suffix. */
  title: string
  description: string
  /** Keep out of search results (per-visitor pages). */
  noindex?: boolean
}): Metadata {
  const title = `${opts.title} | ${PORTAL_SITE_NAME}`
  return {
    title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      title,
      description: opts.description,
      url: opts.path,
      siteName: PORTAL_SITE_NAME,
      type: 'website',
      images: [DEFAULT_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: opts.description,
      images: [DEFAULT_IMAGE.url],
    },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  }
}
