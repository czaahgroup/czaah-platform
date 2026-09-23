import Link from 'next/link'
import type { Metadata } from 'next'
import { MarkhorMark } from '@/components/MarkhorMark'
import { PortalNav } from './_components/PortalNav'
import { PortalContentProvider } from './_components/PortalContentProvider'
import { loadPortalContent } from '@/lib/portalContent'
import { loadLocationTree } from '@/lib/propertyLocations'
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

// The brief's footer: the main sections, then tools and legal.
const FOOTER_LINKS = [
  { label: 'Buy', href: '/property-portal/buy' },
  { label: 'Rent', href: '/property-portal/rent' },
  { label: 'Sell', href: '/property-portal/sell' },
  { label: 'Investments', href: '/property-portal/listings?with_yield=1&sort=yield-desc' },
  { label: 'New Projects', href: '/property-portal/new-projects' },
  { label: 'Developers', href: '/property-portal/developers' },
  { label: 'Locations', href: '/property-portal/destinations' },
  { label: 'All Properties', href: '/property-portal/listings' },
  { label: 'Compare Markets', href: '/property-portal/allocator' },
  { label: 'Market Insights', href: '/property-portal/insights' },
  { label: 'About', href: '/property-portal/about' },
  { label: 'Contact', href: '/property-portal/contact' },
]

export default async function PropertyPortalLayout({ children }: { children: React.ReactNode }) {
  // Loaded server-side so the first render already has the stored settings —
  // useListings fires its request before any effect could update them.
  const [stored, locations] = await Promise.all([loadPortalContent(), loadLocationTree()])
  const content = { ...stored, locations }

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
                CZAAH Properties is a London-based international property company. Buy, sell,
                rent and invest in property across the United Kingdom, Dubai and Pakistan.
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
              <a href="https://czaah.com">czaah.com</a>
              <a href="https://czaah.com/sectors/realestate">Real Estate Sector</a>
              <a href="https://czaah.com/about">About CZAAH</a>
              {/* From the office list, so it can never claim an office that isn't there. */}
              <p>{content.offices.offices.map((o) => o.city).join(' · ')}</p>
            </div>
          </div>
        </div>
        <div className="pp-footer-bottom">
          <span>© {new Date().getFullYear()} CZAAH Properties · part of CZAAH. All rights reserved.</span>
          <span>
            <Link href="/terms">Terms &amp; Conditions</Link> &nbsp;·&nbsp; <Link href="/privacy">Privacy Policy</Link> &nbsp;·&nbsp; <Link href="/privacy#cookies">Cookie Policy</Link>
          </span>
        </div>
      </footer>
    </div>
    </PortalContentProvider>
  )
}
