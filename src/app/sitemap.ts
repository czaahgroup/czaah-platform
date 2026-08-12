import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
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
