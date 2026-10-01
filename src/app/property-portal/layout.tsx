import Link from 'next/link'
import type { Metadata } from 'next'
import { MarkhorMark } from '@/components/MarkhorMark'
import { PortalNav } from './_components/PortalNav'
import { PortalContentProvider } from './_components/PortalContentProvider'
import { loadPortalContent } from '@/lib/portalContent'
import { loadLocationTree } from '@/lib/propertyLocations'
import './_components/portal.css'
import './_components/portal-v2.css'

const PORTAL_TITLE = 'CZAAH Properties — Global Property. One Trusted Partner.'
const PORTAL_DESCRIPTION =
  'Buy, sell, rent and invest with CZAAH Properties — curated opportunities, trusted guidance and support from search to completion.'

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

// Footer columns. Locations is built from Admin → Locations in the component,
// so a market added there appears here without a code change.
const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Properties',
    links: [
      { label: 'Buy', href: '/property-portal/buy' },
      { label: 'Rent', href: '/property-portal/rent' },
      { label: 'Off-Plan', href: '/property-portal/new-projects' },
      { label: 'Commercial', href: '/property-portal/buy?type=commercial' },
      { label: 'All Properties', href: '/property-portal/listings' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Property Sourcing', href: '/property-portal/find-a-property' },
      { label: 'Sell Property', href: '/property-portal/sell' },
      { label: 'Property Investment', href: '/property-portal/investments' },
      { label: 'Compare Markets', href: '/property-portal/allocator' },
      { label: 'Speak to an Advisor', href: '/property-portal/contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/property-portal/about' },
      { label: 'Contact', href: '/property-portal/contact' },
      { label: 'Insights', href: '/property-portal/insights' },
      { label: 'Developers', href: '/property-portal/developers' },
    ],
  },
]

export default async function PropertyPortalLayout({ children }: { children: React.ReactNode }) {
  // Loaded server-side so the first render already has the stored settings —
  // useListings fires its request before any effect could update them.
  const [stored, locations] = await Promise.all([loadPortalContent(), loadLocationTree()])
  const content = { ...stored, locations }
  const markets = (locations || []).flatMap((r) => r.countries).slice(0, 6)

  return (
    <PortalContentProvider content={content}>
    <div className="pp-root">
      {/* WCAG 2.4.1: keyboard users can jump past the navigation. */}
      <a href="#pp-main" className="pp-skip">Skip to content</a>
      <PortalNav />
      <div id="pp-main" tabIndex={-1} style={{ outline: "none" }}>{children}</div>
      <footer className="pp-footer">
        <div className="pp-container">
          <div className="pp-footer-grid">
            <div>
              <div className="pp-logo">
                <MarkhorMark className="pp-logo-mark" />
                <span className="pp-logo-divider" />
                <span className="pp-logo-word">CZAAH</span>
                <span className="pp-logo-sub">Properties</span>
              </div>
              <p className="pp-footer-line">Global Property. One Trusted Partner.</p>
              <p className="pp-footer-tagline">
                Buy, sell, rent and invest with CZAAH Properties — curated opportunities, trusted
                guidance and support from search to completion.
              </p>
              {/* From the office list, so it can never claim an office that isn't there. */}
              <p className="pp-footer-offices">{content.offices.offices.map((o) => o.city).join(' · ')}</p>
            </div>
            <div className="pp-footer-col">
              <h4>Properties</h4>
              {FOOTER_COLUMNS[0].links.map((l) => <Link key={l.label} href={l.href}>{l.label}</Link>)}
            </div>
            <div className="pp-footer-col">
              <h4>Locations</h4>
              {markets.map((c) => (
                <Link key={c.id} href={`/property-portal/buy/${c.slug}`}>{c.name}</Link>
              ))}
              <Link href="/property-portal/destinations">All locations</Link>
            </div>
            {FOOTER_COLUMNS.slice(1).map((col) => (
              <div className="pp-footer-col" key={col.title}>
                <h4>{col.title}</h4>
                {col.links.map((l) => <Link key={l.label} href={l.href}>{l.label}</Link>)}
                {col.title === 'Company' && <a href="https://czaah.com">CZAAH Group</a>}
              </div>
            ))}
          </div>
        </div>
        <div className="pp-footer-bottom">
          <span>© {new Date().getFullYear()} CZAAH Properties · part of CZAAH Group. All rights reserved.</span>
          <span>
            <Link href="/terms">Terms &amp; Conditions</Link> &nbsp;·&nbsp; <Link href="/privacy">Privacy Policy</Link> &nbsp;·&nbsp; <Link href="/privacy#cookies">Cookie Policy</Link>
          </span>
        </div>
      </footer>
    </div>
    </PortalContentProvider>
  )
}
