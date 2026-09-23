import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { portalSitemap } from '@/lib/portalSitemap'

// One app, two sites. The middleware matcher skips .xml, so this file sees
// every host directly — property.czaah.com used to be served czaah.com's
// sitemap. It now gets its own (listings, developments, destinations).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if ((await headers()).get('host') === 'property.czaah.com') return portalSitemap()

  const baseUrl = 'https://czaah.com'

  const staticPages = [
    '', '/about', '/team', '/contact', '/investments', '/process', '/insights',
    '/faq', '/privacy', '/terms', '/login', '/register',
  ]

  const sectors = [
    'minerals', 'realestate', 'construction', 'technology', 'textiles',
    'agriculture', 'pharmaceuticals', 'engineering', 'aviation', 'manpower',
    'tourism', 'luxury-rentals', 'education',
  ]

  const services = [
    'business-setup', 'licensing', 'import-export', 'investor-protection',
    'investment-advisory', 'partnership-development', 'government', 'security',
    'payment-solutions', 'investment-migration',
  ]

  return [
    ...staticPages.map(page => ({
      url: `${baseUrl}${page}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: page === '' ? 1 : 0.8,
    })),
    ...sectors.map(slug => ({
      url: `${baseUrl}/sectors/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...services.map(slug => ({
      url: `${baseUrl}/services/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
