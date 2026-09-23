import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

// One app serves two sites, so robots.txt depends on the host asking. Before
// this file existed czaah.com/robots.txt redirected crawlers to /login and
// property.czaah.com/robots.txt was a 404.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') || ''

  if (host === 'property.czaah.com') {
    return {
      rules: [
        {
          userAgent: '*',
          allow: '/',
          // Per-visitor and private surfaces.
          disallow: ['/api/', '/saved', '/login', '/register', '/reset-password'],
        },
      ],
      sitemap: 'https://property.czaah.com/sitemap.xml',
      host: 'https://property.czaah.com',
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/dashboard',
          '/partner-network',
          '/webmail',
          '/pending',
          '/meet/',
          '/property-portal', // served canonically on property.czaah.com
        ],
      },
    ],
    sitemap: 'https://czaah.com/sitemap.xml',
    host: 'https://czaah.com',
  }
}
