import Link from 'next/link'
import type { Metadata } from 'next'
import { MarkhorMark } from '@/components/MarkhorMark'
import { PortalNav } from './_components/PortalNav'
import './_components/portal.css'

export const metadata: Metadata = {
  title: 'CZAAH Property — Investment Real Estate in London, Dubai & Pakistan',
  description:
    'CZAAH Property — pre-vetted, title-verified real estate investment opportunities across London, Dubai and Pakistan, with end-to-end transaction support from a single institutional counterparty.',
}

const FOOTER_LINKS = [
  { label: 'All Listings', href: '/property-portal/listings' },
  { label: 'Off-Plan Projects', href: '/property-portal/off-plan' },
  { label: 'London', href: '/property-portal/listings?market=london' },
  { label: 'Dubai', href: '/property-portal/listings?market=dubai' },
  { label: 'Pakistan', href: '/property-portal/listings?market=pakistan' },
  { label: 'Sell Your Property', href: '/property-portal/sell' },
  { label: 'Market Insights', href: '/property-portal/insights' },
  { label: 'Contact', href: '/contact?interest=Real%20Estate#contact-form' },
]

export default function PropertyPortalLayout({ children }: { children: React.ReactNode }) {
  return (
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
            <div className="pp-footer-col">
              <h4>Explore</h4>
              {FOOTER_LINKS.map((l) => (
                <Link key={l.label} href={l.href}>{l.label}</Link>
              ))}
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
  )
}
