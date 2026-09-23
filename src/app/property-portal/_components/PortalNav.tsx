'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MarkhorMark } from '@/components/MarkhorMark';
import { CURRENCIES } from './types';
import { useCurrencyPref, useWishlist } from './usePortalPrefs';

// The CZAAH Properties brief's navigation. Investments and New Projects point
// at the existing listings and off-plan pages until their own sections exist
// (phases 6–7); Allocate Capital and Insights moved to the footer.
const LINKS: { label: string; href: string; neverActive?: boolean }[] = [
  { label: 'Home', href: '/property-portal' },
  { label: 'Buy', href: '/property-portal/buy' },
  { label: 'Rent', href: '/property-portal/rent' },
  { label: 'Sell', href: '/property-portal/sell' },
  // Shares /listings with search results, so it must not light up for them.
  { label: 'Investments', href: '/property-portal/listings?sort=yield-desc', neverActive: true },
  { label: 'New Projects', href: '/property-portal/off-plan' },
  { label: 'Locations', href: '/property-portal/destinations' },
  { label: 'About', href: '/property-portal/about' },
  { label: 'Contact', href: '/property-portal/contact' },
];

const CTA_HREF = '/property-portal/contact';
const SEARCH_HREF = '/property-portal/listings';

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
  // On property.czaah.com the address bar shows clean paths (/buy) while the
  // links and checks below use the internal ones (/property-portal/buy).
  // Map back so the active link and the over-hero state work on both hosts.
  const rawPath = usePathname() || '/';
  const pathname = rawPath.startsWith('/property-portal')
    ? rawPath
    : `/property-portal${rawPath === '/' ? '' : rawPath}`;
  const { currency, setCurrency } = useCurrencyPref();
  const { count } = useWishlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    // Closed, the drawer is only visually hidden, so `inert` keeps its links
    // out of the tab order and away from screen readers. Set on the element:
    // React 18 drops an `inert` prop.
    if (drawerRef.current) drawerRef.current.inert = !open;
    if (open) {
      drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };
      window.addEventListener('keydown', onKey);
      wasOpen.current = true;
      return () => window.removeEventListener('keydown', onKey);
    }
    // Only return focus when the drawer actually closed, not on first render.
    if (wasOpen.current) toggleRef.current?.focus();
    wasOpen.current = false;
  }, [open]);

  // The bar is fixed, so .pp-root reserves its height through --pp-nav-h. That
  // token was maintained by hand in portal.css and drifted every time the bar
  // changed size (60px reserved against a 65px bar on phones, so the top of
  // every page sat under the glass). Measure the real bar and publish it —
  // .pp-nav-inner, not the header, because the header also contains the open
  // drawer. The CSS values stay as the pre-hydration fallback.
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    const root = bar?.closest('.pp-root') as HTMLElement | null;
    if (!bar || !root) return;
    const sync = () => {
      const header = bar.parentElement;
      const border = header ? parseFloat(getComputedStyle(header).borderBottomWidth) || 0 : 0;
      root.style.setProperty('--pp-nav-h', `${Math.round(bar.getBoundingClientRect().height + border)}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(bar);
    window.addEventListener('resize', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, []);

  // With the drawer open the page behind it still scrolled under the thumb,
  // which on a phone reads as the menu itself sliding away.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // On a hero page the bar stays clear the whole way down — it carries its
  // own gradient backdrop so the white links hold over the light sections
  // further down the page. The mobile drawer is the one exception: it covers
  // the viewport, so the bar behind it must go solid.
  const overHero = !open;
  // Past the hero the bar gains a shadow to lift it off the page.
  const lifted = overHero && (scrolled || !hasHero(pathname));

  function isActive(href: string, neverActive?: boolean) {
    if (neverActive) return false;
    const path = href.split('?')[0];
    if (path === '/property-portal') return pathname === path;
    return pathname === path || pathname.startsWith(path + '/');
  }

  return (
    <div className="pp-navwrap">
      <header className={`pp-nav${overHero ? ' is-over-hero' : ' is-solid'}${lifted ? ' is-lifted' : ''}`}>
      <div className="pp-nav-inner" ref={barRef}>
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
              className={isActive(l.href, l.neverActive) ? 'active' : undefined}
              aria-current={isActive(l.href, l.neverActive) ? 'page' : undefined}
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
            href={SEARCH_HREF}
            className="pp-nav-saved pp-nav-search"
            aria-label="Search properties"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
          </Link>

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

          <button
            ref={toggleRef}
            className="pp-nav-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="pp-mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M3 7h18" /><path d="M3 12h18" /><path d="M3 17h18" /></>}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="pp-mobile-menu"
        ref={drawerRef}
        className={`pp-mobile-menu${open ? ' open' : ''}`}
      >
        {LINKS.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className={isActive(l.href, l.neverActive) ? 'active' : undefined}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        <Link href={SEARCH_HREF} onClick={() => setOpen(false)}>Search</Link>
        {/* On the smallest phones the bar has no room for the currency
            picker, so it lives here too. */}
        <label className="pp-mobile-ccy">
          <span>Display currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="">Original</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <Link href="/property-portal/saved" onClick={() => setOpen(false)}>
          Saved{count > 0 ? ` (${count})` : ''}
        </Link>
        <Link href={CTA_HREF} className="pp-mobile-cta" onClick={() => setOpen(false)}>
          Speak to CZAAH
        </Link>
      </div>
      </header>
    </div>
  );
}
