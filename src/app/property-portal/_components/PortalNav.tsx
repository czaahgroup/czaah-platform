'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarkhorMark } from '@/components/MarkhorMark';

const LINKS = [
  { label: 'Buy', href: '/property-portal/listings' },
  { label: 'Off-Plan', href: '/property-portal/off-plan' },
  { label: 'Sell', href: '/property-portal/sell' },
  { label: 'Insights', href: '/property-portal/insights' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact?interest=Real%20Estate#contact-form' },
];

const CTA_HREF = '/contact?interest=Real%20Estate#contact-form';

export function PortalNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="pp-annc">
        Pre-vetted, title-verified property across London, Dubai &amp; Pakistan —{' '}
        <Link href="/property-portal/listings">view all listings</Link>
      </div>
      <nav className="pp-nav">
        <div className="pp-nav-inner">
          <Link href="/property-portal" className="pp-logo" onClick={() => setOpen(false)}>
            <MarkhorMark className="pp-logo-mark" />
            <span className="pp-logo-divider" />
            <span className="pp-logo-word">CZAAH</span>
          </Link>
          <div className="pp-nav-links">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href}>{l.label}</Link>
            ))}
            <Link href={CTA_HREF} className="pp-nav-cta">Book a Call</Link>
          </div>
          <button
            className="pp-nav-toggle"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
            </svg>
          </button>
        </div>
        <div className={`pp-mobile-menu ${open ? 'open' : ''}`}>
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <Link href={CTA_HREF} onClick={() => setOpen(false)}>Book a Call</Link>
        </div>
      </nav>
    </>
  );
}
