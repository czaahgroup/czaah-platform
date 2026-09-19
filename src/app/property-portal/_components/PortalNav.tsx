'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MarkhorMark } from '@/components/MarkhorMark';
import { CURRENCIES } from './types';
import { useCurrencyPref, useWishlist } from './usePortalPrefs';

const LINKS = [
  { label: 'Destinations', href: '/property-portal/destinations' },
  { label: 'Off-Plan', href: '/property-portal/off-plan' },
  { label: 'Allocate Capital', href: '/property-portal/allocator' },
  { label: 'Insights', href: '/property-portal/insights' },
  { label: 'Sell With Us', href: '/property-portal/sell' },
  { label: 'About Us', href: '/property-portal/about' },
];

const CTA_HREF = '/property-portal/contact';

// Pages that open with a full-bleed hero the bar can sit over. Anywhere else
// it is solid from the first pixel, otherwise it would float over body copy.
function hasHero(pathname: string) {
  return (
    pathname === '/property-portal' ||
    /^\/property-portal\/destinations\/[^/]+$/.test(pathname)
  );
}

export function PortalNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { currency, setCurrency } = useCurrencyPref();
  const { count } = useWishlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // On a hero page the bar stays clear the whole way down — it carries its
  // own gradient backdrop so the white links hold over the light sections
  // further down the page. The mobile drawer is the one exception: it covers
  // the viewport, so the bar behind it must go solid.
  const overHero = !open;
  // Past the hero the bar gains a shadow to lift it off the page.
  const lifted = overHero && (scrolled || !hasHero(pathname));

  function isActive(href: string) {
    const path = href.split('?')[0];
    if (path === '/property-portal') return pathname === path;
    return pathname === path || pathname.startsWith(path + '/');
  }

  return (
    <div className="pp-navwrap">
      <header className={`pp-nav${overHero ? ' is-over-hero' : ' is-solid'}${lifted ? ' is-lifted' : ''}`}>
      <div className="pp-nav-inner">
        <Link href="/property-portal" className="pp-logo" onClick={() => setOpen(false)}>
          <MarkhorMark className="pp-logo-mark" />
          <span className="pp-logo-divider" />
          <span className="pp-logo-word">CZAAH</span>
        </Link>

        <nav className="pp-nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={isActive(l.href) ? 'active' : undefined}
              aria-current={isActive(l.href) ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="pp-nav-tools">
          <label className="pp-nav-ccy">
            <span className="pp-sr-only">Display currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="">CCY</option>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <Link
            href="/property-portal/saved"
            className="pp-nav-saved"
            aria-label={`Saved properties${count ? ` (${count})` : ''}`}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill={count ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M12 20s-7-4.6-7-9.3A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.7C19 15.4 12 20 12 20Z" />
            </svg>
            {count > 0 && <span className="pp-nav-badge">{count}</span>}
          </Link>

          <Link href={CTA_HREF} className="pp-nav-cta">Get in Touch</Link>

          <button
            className="pp-nav-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M3 7h18" /><path d="M3 12h18" /><path d="M3 17h18" /></>}
            </svg>
          </button>
        </div>
      </div>

      <div className={`pp-mobile-menu${open ? ' open' : ''}`}>
        {LINKS.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className={isActive(l.href) ? 'active' : undefined}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        <Link href="/property-portal/saved" onClick={() => setOpen(false)}>
          Saved{count > 0 ? ` (${count})` : ''}
        </Link>
        <Link href={CTA_HREF} className="pp-mobile-cta" onClick={() => setOpen(false)}>
          Get in Touch
        </Link>
      </div>
      </header>
    </div>
  );
}
