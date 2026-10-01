'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { portalLocations, portalHeroReel } from './portalRuntime';
import { isRental, sizedImage, fallbackToOriginal, convertPrice, type LiveProperty } from './types';
import { marketGuide } from './marketGuides';
import { track } from './analytics';
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
          image: (c.image_url && pick([sizedImage(c.image_url)])) || pick(mine.map((p) => sizedImage(p.images?.[0]))) || nextPoster(),
          cta: 'Explore',
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
            <h2 className="pp-h2">Explore global markets</h2>
          </div>
          <Link href="/property-portal/destinations" className="pp-link-arrow">All locations →</Link>
        </div>
        <div className="pp-market-cards">
          {cards.map((m) => (
            <Link key={m.key} href={m.href} className="pp-market-card">
              <div className="pp-market-card-img">
                {m.image ? <img src={m.image} alt="" loading="lazy" decoding="async" onError={fallbackToOriginal} /> : <div className="pp-card-img--empty" aria-hidden="true">⌂</div>}
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

/** Owners, landlords and developers. */
export function OwnerCta() {
  return (
    <section className="pp-section pp-owner">
      <div className="pp-container pp-owner-inner">
        <div>
          <div className="pp-eyebrow">For owners and developers</div>
          <h2 className="pp-h2">Selling or renting a property?</h2>
          <p className="pp-section-lead">
            List your property with CZAAH and reach buyers, tenants and investors through our
            international property platform. Every submission is reviewed by our team before
            anything is published.
          </p>
        </div>
        <div className="pp-owner-actions">
          <ButtonLink href="/property-portal/sell">List Your Property</ButtonLink>
          <Link href="/property-portal/sell?path=development" className="pp-link-arrow">List a development →</Link>
        </div>
      </div>
    </section>
  );
}

/** Personal property sourcing — leads to the guided request. */
export function SourcingBand() {
  return (
    <section className="pp-source">
      <div className="pp-container pp-source-inner">
        <div>
          <div className="pp-eyebrow">Personal property sourcing</div>
          <h2 className="pp-h2">Can&rsquo;t find what you&rsquo;re looking for?</h2>
          <p>
            Tell CZAAH what you need and our team can search the market, shortlist suitable
            opportunities and help you through the next steps.
          </p>
        </div>
        <ButtonLink href="/property-portal/find-a-property">Find a Property for Me</ButtonLink>
      </div>
    </section>
  );
}

const PILLARS = [
  { t: 'Global Reach', d: 'Access opportunities across multiple property markets through one platform.' },
  { t: 'Personal Property Sourcing', d: 'Tell us exactly what you need and CZAAH can help identify suitable opportunities.' },
  { t: 'Trusted Guidance', d: 'Clear information and support throughout the property journey.' },
  { t: 'One Point of Contact', d: 'Search, view, negotiate and progress your property requirements with one trusted partner.' },
];

export function WhyPillars() {
  return (
    <section className="pp-section">
      <div className="pp-container">
        <div className="pp-section-head">
          <div>
            <div className="pp-eyebrow">Global Property. One Trusted Partner.</div>
            <h2 className="pp-h2">Why CZAAH Properties</h2>
          </div>
          <Link href="/property-portal/about" className="pp-link-arrow">About us →</Link>
        </div>
        <p className="pp-section-lead pp-pillars-lead">
          More than a listings directory: we help clients discover, compare and progress suitable
          property opportunities.
        </p>
        <div className="pp-pillars">
          {PILLARS.map((p, i) => (
            <div className="pp-pillar" key={p.t}>
              <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { t: 'Tell Us What You Need', d: 'Share your goals, location, budget and timing.' },
  { t: 'We Search & Shortlist', d: 'We look across our listings and network for property that fits.' },
  { t: 'View & Compare', d: 'See the shortlist side by side, in person or by video.' },
  { t: 'Move Forward With Confidence', d: 'One point of contact through offer, paperwork and completion.' },
];

export function HowItWorks() {
  return (
    <section className="pp-section pp-stats-band">
      <div className="pp-container">
        <div className="pp-section-head">
          <div>
            <div className="pp-eyebrow">How it works</div>
            <h2 className="pp-h2">Four steps, one team</h2>
          </div>
        </div>
        <ol className="pp-steps">
          {STEPS.map((s, i) => (
            <li key={s.t}>
              <i aria-hidden="true">{i + 1}</i>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="pp-steps-cta">
          <ButtonLink href="/property-portal/find-a-property">Start Your Property Search</ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function AdvisorCta() {
  return (
    <section className="pp-cta-band pp-advisor">
      <div className="pp-container">
        <h2 className="pp-h2">Speak to an advisor</h2>
        <p>
          Tell us the market, budget and objective. We will come back with suitable options and
          clear next steps.
        </p>
        <div className="pp-cta-actions">
          <ButtonLink href="/property-portal/contact" onClick={() => track('advisor_clicked', { via: 'home_cta' })}>Speak to an Advisor</ButtonLink>
          <ButtonLink href="/property-portal/find-a-property" variant="ghost">Request a Property Shortlist</ButtonLink>
        </div>
      </div>
    </section>
  );
}

const TYPE_NAME: Record<string, string> = { residential: 'Residential', commercial: 'Commercial', industrial: 'Industrial', mixed_use: 'Mixed use', land: 'Land' };
const compact = (n: number) =>
  n >= 1e6 ? `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n));

/**
 * Compare Property Markets. Every figure is counted from CZAAH's own live
 * listings and labelled as such — nothing here is a market statistic, and no
 * market is ranked. Guidance rows (ownership, costs, financing) appear only
 * once written content exists in marketGuides.ts.
 */
export function CompareMarkets({ properties }: { properties: LiveProperty[] }) {
  const tree = portalLocations() || [];
  const rows = useMemo(() => {
    return tree.flatMap((r) => r.countries).map((c) => {
      const mine = properties.filter((p) => inCountry(p, c.name));
      const sale = mine.filter((p) => !isRental(p) && p.price);
      const usd = sale.map((p) => convertPrice(p.price as number, p.currency, 'USD')).filter((v): v is number => v != null && v > 0);
      const types = [...new Set(mine.map((p) => TYPE_NAME[p.property_type] || p.property_type).filter(Boolean))];
      return {
        country: c,
        count: mine.length,
        from: usd.length ? Math.min(...usd) : null,
        to: usd.length ? Math.max(...usd) : null,
        types,
        offPlan: mine.filter((p) => p.listing_type === 'off_plan').length,
        rentals: mine.filter(isRental).length,
        guide: marketGuide(c.code),
      };
    });
  }, [tree, properties]);

  if (rows.length < 2) return null;
  return (
    <section className="pp-section">
      <div className="pp-container">
        <div className="pp-section-head">
          <div>
            <div className="pp-eyebrow">Compare property markets</div>
            <h2 className="pp-h2">Find the right market for your goals</h2>
          </div>
          <Link href="/property-portal/allocator" className="pp-link-arrow">Compare by budget →</Link>
        </div>
        <div className="pp-compare">
          {rows.map((m) => (
            <article className="pp-compare-card" key={m.country.id}>
              <h3>{m.country.name}</h3>
              {m.guide?.overview && <p className="pp-compare-overview">{m.guide.overview}</p>}
              <dl>
                <div><dt>Currency</dt><dd>{m.country.currency}</dd></div>
                <div><dt>Properties listed</dt><dd>{m.count}</dd></div>
                {m.from != null && m.to != null && (
                  <div>
                    <dt>Listed prices</dt>
                    <dd>{m.from === m.to ? `~ USD ${compact(m.from)}` : `~ USD ${compact(m.from)} – ${compact(m.to)}`}</dd>
                  </div>
                )}
                {m.types.length > 0 && <div><dt>Property types</dt><dd>{m.types.join(', ')}</dd></div>}
                <div><dt>Off-plan</dt><dd>{m.offPlan > 0 ? `${m.offPlan} listed` : 'None listed'}</dd></div>
                <div><dt>Rentals</dt><dd>{m.rentals > 0 ? `${m.rentals} listed` : 'None listed'}</dd></div>
                {m.guide?.ownership && <div><dt>Ownership</dt><dd>{m.guide.ownership}</dd></div>}
                {m.guide?.costs && <div><dt>Transaction costs</dt><dd>{m.guide.costs}</dd></div>}
                {m.guide?.financing && <div><dt>Financing</dt><dd>{m.guide.financing}</dd></div>}
              </dl>
              <Link href={locationHref('buy', m.country)} className="pp-link-arrow">View properties →</Link>
            </article>
          ))}
        </div>
        <p className="pp-disclaimer">
          Counts and prices are taken from the properties listed with CZAAH Properties today, shown
          as approximate US dollar equivalents. They are not market averages. Ownership rules,
          transaction costs and financing differ by market and by buyer —{' '}
          <Link href="/property-portal/contact" className="pp-gold">speak to an advisor</Link> for
          guidance on your situation. Nothing here is investment, tax or legal advice.
        </p>
      </div>
    </section>
  );
}
