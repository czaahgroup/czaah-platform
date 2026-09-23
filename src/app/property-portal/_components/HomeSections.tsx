'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { portalLocations, portalHeroReel } from './portalRuntime';
import { resolveImage, isRental, type LiveProperty } from './types';
import { locationHref } from './locationNav';
import { ButtonLink } from './ui';

// Home page sections from the CZAAH Properties brief (§4). Everything shown
// is derived from live data — markets from Admin → Locations, counts from
// real listings — so nothing here can claim stock or markets that aren't there.

const inCountry = (p: LiveProperty, name: string) => (p.country || '').trim().toLowerCase() === name.toLowerCase();

/** §4.3 — one card per active market, plus regions CZAAH is expanding into. */
export function FeaturedMarkets({ properties }: { properties: LiveProperty[] }) {
  const tree = portalLocations() || [];
  const posters = portalHeroReel().map((c) => c.poster).filter(Boolean);

  const cards = useMemo(() => {
    type Card = { key: string; name: string; text: string; count: number | null; href: string; image: string | null; cta: string };
    const out: Card[] = [];
    const expanding: Card[] = [];
    let posterIndex = 0;
    // Listings often share a stock photo; never show the same image on two cards.
    const used = new Set<string>();
    const pick = (candidates: (string | null | undefined)[]) => {
      const img = candidates.find((u): u is string => !!u && !used.has(u)) || null;
      if (img) used.add(img);
      return img;
    };
    const nextPoster = () => {
      for (let i = 0; i < posters.length; i++) {
        const p = posters[posterIndex++ % posters.length];
        if (p && !used.has(p)) { used.add(p); return p; }
      }
      return null;
    };
    for (const region of tree) {
      for (const c of region.countries) {
        const mine = properties.filter((p) => inCountry(p, c.name));
        const cities = c.cities.map((ci) => ci.name).slice(0, 4);
        const list = cities.length > 1 ? `${cities.slice(0, -1).join(', ')} and ${cities[cities.length - 1]}` : cities[0] || c.name;
        out.push({
          key: c.id,
          name: c.name,
          // Admin → Locations copy wins; otherwise a plain factual line.
          text: c.tagline || c.description || `Property to buy and rent in ${list}.`,
          count: mine.length,
          href: locationHref('buy', c),
          image: (c.image_url && pick([resolveImage(c.image_url)])) || pick(mine.map((p) => resolveImage(p.images?.[0]))) || nextPoster(),
          cta: 'Explore properties',
        });
      }
      // A region with a description is one CZAAH is expanding into (set in
      // Admin → Locations) — shown as such, never as live inventory.
      if (region.description) {
        expanding.push({
          key: `region-${region.id}`,
          name: region.name,
          text: region.description,
          count: null,
          href: `/property-portal/destinations#${region.slug}`,
          image: nextPoster(),
          cta: 'Register your interest',
        });
      }
    }
    return [...out, ...expanding];
  }, [tree, properties, posters]);

  if (!cards.length) return null;
  return (
    <section className="pp-section">
      <div className="pp-container">
        <div className="pp-section-head">
          <div>
            <div className="pp-eyebrow">Markets</div>
            <h2 className="pp-h2">Featured markets</h2>
          </div>
          <Link href="/property-portal/destinations" className="pp-link-arrow">All locations →</Link>
        </div>
        <div className="pp-market-cards">
          {cards.map((m) => (
            <Link key={m.key} href={m.href} className="pp-market-card">
              <div className="pp-market-card-img">
                {m.image ? <img src={m.image} alt="" loading="lazy" /> : <div className="pp-card-img--empty" aria-hidden="true">⌂</div>}
              </div>
              <div className="pp-market-card-body">
                <h3>{m.name}</h3>
                <p>{m.text}</p>
                <span className="pp-market-card-foot">
                  {m.count != null && <span>{m.count} {m.count === 1 ? 'property' : 'properties'}</span>}
                  <span className="pp-link-arrow">{m.cta} →</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * §4.6 — investment categories with live counts. Factual only: no return is
 * promised, and a category with nothing in it is not shown.
 */
export function InvestmentOpportunities({ properties }: { properties: LiveProperty[] }) {
  const tiles = useMemo(() => {
    const sale = properties.filter((p) => !isRental(p));
    return [
      { t: 'Income-producing property', d: 'Listings with a stated rental yield, shown with its source.', n: sale.filter((p) => p.yield_percentage != null).length, href: '/property-portal/listings?with_yield=1&sort=yield-desc' },
      { t: 'Off-plan opportunities', d: 'Buy ahead of completion, often with a staged payment plan.', n: sale.filter((p) => p.listing_type === 'off_plan').length, href: '/property-portal/off-plan' },
      // Counts use exactly the filter the landing page applies, so the number on
      // a tile is the number of results behind it.
      { t: 'Commercial investments', d: 'Offices, retail and other commercial property.', n: sale.filter((p) => p.property_type === 'commercial').length, href: '/property-portal/buy?type=commercial' },
      { t: 'Industrial property', d: 'Warehousing, manufacturing and industrial estates.', n: sale.filter((p) => p.property_type === 'industrial').length, href: '/property-portal/buy?type=industrial' },
      { t: 'Rental opportunities', d: 'Homes and commercial space available to let.', n: properties.filter(isRental).length, href: '/property-portal/rent' },
      { t: 'Land & plots', d: 'Residential, commercial and agricultural plots.', n: sale.filter((p) => p.property_type === 'land').length, href: '/property-portal/buy?type=land' },
    ].filter((x) => x.n > 0);
  }, [properties]);

  if (!tiles.length) return null;
  return (
    <section className="pp-section pp-stats-band">
      <div className="pp-container">
        <div className="pp-section-head">
          <div>
            <div className="pp-eyebrow">Investments</div>
            <h2 className="pp-h2">Investment opportunities</h2>
          </div>
          <Link href="/property-portal/allocator" className="pp-link-arrow">Compare markets →</Link>
        </div>
        <div className="pp-invest-tiles">
          {tiles.map((x) => (
            <Link key={x.t} href={x.href} className="pp-invest-tile">
              <strong>{x.t}</strong>
              <span>{x.d}</span>
              <em>{x.n} {x.n === 1 ? 'listing' : 'listings'} →</em>
            </Link>
          ))}
        </div>
        <div className="pp-invest-foot">
          <ButtonLink href="/property-portal/investments">Explore investments</ButtonLink>
          <p className="pp-disclaimer" style={{ margin: 0 }}>
            Figures are as supplied for each listing and labelled with their source. No return is
            guaranteed; take independent advice before investing.
          </p>
        </div>
      </div>
    </section>
  );
}

/** §4.9 — owners, landlords and developers. */
export function OwnerCta() {
  return (
    <section className="pp-cta-band pp-owner-cta">
      <div className="pp-container">
        <h2 className="pp-h2">Looking to sell, let or list a development?</h2>
        <p>Tell us about it. Every submission is reviewed by our team before anything is published.</p>
        <div className="pp-cta-actions">
          <ButtonLink href="/property-portal/sell?path=sell">Sell your property</ButtonLink>
          <ButtonLink href="/property-portal/sell?path=let" variant="ghost">Let your property</ButtonLink>
          <ButtonLink href="/property-portal/sell?path=development" variant="ghost">List a development</ButtonLink>
          <ButtonLink href="/property-portal/sell?path=partnership" variant="ghost">Partner with CZAAH</ButtonLink>
        </div>
      </div>
    </section>
  );
}
