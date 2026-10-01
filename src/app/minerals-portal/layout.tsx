import Link from 'next/link'
import type { Metadata } from 'next'
import { MarkhorMark } from '@/components/MarkhorMark'

const TITLE = 'CZAAH Minerals — Mineral supply, joint ventures and licences'
const DESCRIPTION =
  'Browse mineral offers, joint ventures and licences listed through CZAAH, and request a quote. Every offer is reviewed by CZAAH before it is published.'

// The site's public home is minerals.czaah.com, so canonical URLs and share
// previews resolve there rather than on the group site.
export const metadata: Metadata = {
  metadataBase: new URL('https://minerals.czaah.com'),
  title: { default: TITLE, template: '%s | CZAAH Minerals' },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: 'CZAAH Minerals', type: 'website' },
}

const LINKS = [
  { href: '/minerals-portal/offers', label: 'Offers' },
  { href: '/minerals-portal/offers?type=supply', label: 'For sale' },
  { href: '/minerals-portal/offers?type=opportunity', label: 'Opportunities' },
  { href: '/minerals-portal/request', label: 'Request a mineral' },
]

export default function MineralsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface raleway-text flex flex-col">
      <a href="#mn-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-primary focus:text-on-primary focus:px-4 focus:py-2">
        Skip to content
      </a>
      {/* A header element with a navigation role: the group site has a global rule that pins and restyles any nav element. */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest/95 backdrop-blur border-b border-outline-variant/20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/minerals-portal" className="flex items-center gap-3 no-underline">
            <MarkhorMark className="h-9 w-auto" />
            <span>
              <span className="cinzel-text text-lg tracking-[0.18em] text-primary block leading-none">CZAAH</span>
              <span className="text-[10px] tracking-[0.3em] uppercase text-on-surface-variant block mt-1">Minerals</span>
            </span>
          </Link>
          <div role="navigation" aria-label="Main" className="flex items-center gap-x-5 gap-y-2 flex-wrap text-sm">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-on-surface-variant hover:text-primary transition-colors py-2">{l.label}</Link>
            ))}
          </div>
        </div>
      </header>

      <main id="mn-main" className="flex-1">{children}</main>

      <footer className="border-t border-outline-variant/20 bg-surface-container-lowest mt-16">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10 grid gap-8 sm:grid-cols-3 text-sm">
          <div>
            <p className="cinzel-text tracking-[0.15em] text-primary mb-2">CZAAH Minerals</p>
            <p className="text-on-surface-variant leading-relaxed">
              Part of CZAAH Group. Offers are listed by CZAAH and its partners; details are as stated by the seller unless marked Verified.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-on-surface-variant/70 mb-3">Minerals</p>
            <ul className="space-y-2">
              {LINKS.map((l) => <li key={l.href}><Link href={l.href} className="text-on-surface-variant hover:text-primary">{l.label}</Link></li>)}
              <li><a href="https://czaah.com/sectors/minerals" className="text-on-surface-variant hover:text-primary">Minerals &amp; mining at CZAAH</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-on-surface-variant/70 mb-3">CZAAH Group</p>
            <ul className="space-y-2">
              <li><a href="https://czaah.com" className="text-on-surface-variant hover:text-primary">czaah.com</a></li>
              <li><a href="https://property.czaah.com" className="text-on-surface-variant hover:text-primary">CZAAH Properties</a></li>
              <li><a href="https://czaah.com/terms" className="text-on-surface-variant hover:text-primary">Terms</a></li>
              <li><a href="https://czaah.com/privacy" className="text-on-surface-variant hover:text-primary">Privacy</a></li>
              <li><a href="mailto:info@czaah.com" className="text-on-surface-variant hover:text-primary">info@czaah.com</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 pb-8 text-xs text-on-surface-variant/70 leading-relaxed">
          CZAAH Group Ltd, registered in England and Wales, no. 17447314. Registered office: 124 City Road, London EC1V 2NX.
          Nothing on this site is an offer capable of acceptance; terms are agreed in writing.
        </div>
      </footer>
    </div>
  )
}
