import Link from 'next/link'
import type { Metadata } from 'next'
import { MarkhorMark } from '@/components/MarkhorMark'
import { PortalNav } from './_components/PortalNav'
import { PortalContentProvider } from './_components/PortalContentProvider'
import { loadPortalContent } from '@/lib/portalContent'
import './_components/portal.css'

const PORTAL_TITLE = 'CZAAH Properties — Global Property Investment & Real Estate'
const PORTAL_DESCRIPTION =
  'Buy, sell, rent and invest in property across the United Kingdom, Dubai and Pakistan with CZAAH Properties, a London-based international property company.'

// The portal's public home is property.czaah.com, so relative share images and
// canonical URLs resolve there — and links shared from the portal get a
// property preview rather than the group site's "Capital · Ventures" card.
export const metadata: Metadata = {
  metadataBase: new URL('https://property.czaah.com'),
  title: PORTAL_TITLE,
  description: PORTAL_DESCRIPTION,
  openGraph: {
    title: PORTAL_TITLE,
    description: PORTAL_DESCRIPTION,
    siteName: 'CZAAH Properties',
    type: 'website',
    images: [{ url: '/videos/dubai.jpg', alt: 'CZAAH Properties' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: PORTAL_TITLE,
    description: PORTAL_DESCRIPTION,
    images: ['/videos/dubai.jpg'],
  },
}

const FOOTER_LINKS = [
  { label: 'All Listings', href: '/property-portal/listings' },
  { label: 'Destinations', href: '/property-portal/destinations' },
  { label: 'Off-Plan Projects', href: '/property-portal/off-plan' },
  { label: 'Property to Buy', href: '/property-portal/buy' },
  { label: 'Homes to Rent', href: '/property-portal/rent' },
  { label: 'London', href: '/property-portal/listings?market=london' },
  { label: 'Dubai', href: '/property-portal/listings?market=dubai' },
  { label: 'Pakistan', href: '/property-portal/listings?market=pakistan' },
  { label: 'Sell Your Property', href: '/property-portal/sell' },
  { label: 'Market Insights', href: '/property-portal/insights' },
  { label: 'About CZAAH Properties', href: '/property-portal/about' },
  { label: 'Contact', href: '/property-portal/contact' },
]

export default async function PropertyPortalLayout({ children }: { children: React.ReactNode }) {
  // Loaded server-side so the first render already has the stored settings —
  // useListings fires its request before any effect could update them.
  const content = await loadPortalContent()

  return (
    <PortalContentProvider content={content}>
    <div className="pp-root">
      <PortalNav />
      {children}
      <footer className="pp-footer">
        <div className="pp-container">
          <div className="pp-footer-grid">
            <div>
              <div className="pp-logo">
                <MarkhorMark className="pp-logo-mark" />
                <span className="pp-logo-divider" />
                <span className="pp-logo-word">CZAAH</span>
              </div>
              <p className="pp-footer-tagline">
                A dedicated property investment practice within CZAAH — the London-based
                international investment facilitation group. Structured access to real estate
                across London, Dubai and Pakistan.
              </p>
            </div>
            <div className="pp-footer-col pp-footer-col--wide">
              <h4>Explore</h4>
              {/* Nine links in a single spine dwarfed the other columns. */}
              <div className="pp-footer-links-2">
                {FOOTER_LINKS.map((l) => (
                  <Link key={l.label} href={l.href}>{l.label}</Link>
                ))}
              </div>
            </div>
            <div className="pp-footer-col">
              <h4>CZAAH Group</h4>
              <Link href="/">czaah.com</Link>
              <Link href="/sectors/realestate">Real Estate Sector</Link>
              <Link href="/about">About CZAAH</Link>
              <p>Islamabad · London · Brussels · Hong Kong · Middle East</p>
            </div>
          </div>
        </div>
        <div className="pp-footer-bottom">
          <span>© 2026 CZAAH. All rights reserved.</span>
          <span>
            <Link href="/terms">Terms</Link> &nbsp;·&nbsp; <Link href="/privacy">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
    </PortalContentProvider>
  )
}
