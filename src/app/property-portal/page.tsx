'use client';
// @ts-nocheck

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PropertyCard } from './_components/PropertyCard';
import { portalInsights } from './_components/insights-data';
import { useListings } from './_components/useListings';
import { portalHeroReel, portalOffices, portalHomeLayout } from './_components/portalRuntime';
import { normaliseHomeLayout, type HomeSectionKey } from '@/lib/homeLayout';
import { isNewListing, NEW_LISTING_DAYS, resolveImage, convertPrice, formatPrice, isRental } from './_components/types';
import { useCurrencyPref } from './_components/usePortalPrefs';
import { FeaturedMarkets, InvestmentOpportunities, OwnerCta } from './_components/HomeSections';
import { DevelopmentStrip } from './_components/DevelopmentStrip';
import { ButtonLink } from './_components/ui';
import { portalWhyInvest, portalTestimonials } from './_components/portal-content';
import { destinationFor, slugForCity } from './_components/destinations';
import { LocationSearch, suggestionHref, type SearchSection } from './_components/LocationSearch';
import type { Suggestion } from './_components/locationNav';
import { yieldLabel } from '@/lib/marketFields';


const MARKETS = [
  {
    key: 'london',
    name: 'London',
    blurb: 'Grade-A commercial floors, mixed-use blocks and prime residential across the City, Canary Wharf and the West End — freehold and long-leasehold.',
  },
  {
    key: 'dubai',
    name: 'Dubai',
    blurb: 'Freehold offices, off-plan residential and income-producing units in Business Bay, Downtown and Dubai South — with structured payment plans on off-plan stock.',
  },
  {
    key: 'pakistan',
    name: 'Pakistan',
    blurb: 'Commercial, industrial and Special Economic Zone assets across Islamabad, Lahore, Karachi and the CPEC corridor — with CZAAH partners on the ground.',
  },
];

// Hero footage, in play order. Masters live in "Home Hero/" (not committed —
// 4K files exceed Cloudflare's 25MiB per-asset limit); these are 1600×900,
// 10 s, silent web encodes in /public/videos. The poster paints instantly and
// is all that shows on slow connections or under prefers-reduced-motion.
// The reel is editable in admin (Portal content -> Home hero). The shipped
// clips remain the fallback, so an empty list never leaves a black hero.

// Listings uploaded with their own clip join the front of the reel, newest
// first — capped so the brand footage always gets its turn.
const MAX_PROJECT_CLIPS = 3;

const HERO_TYPES = [
  { v: '', l: 'Any type' },
  { v: 'residential', l: 'Residential' },
  { v: 'commercial', l: 'Commercial' },
  { v: 'industrial', l: 'Industrial' },
  { v: 'mixed_use', l: 'Mixed Use' },
  { v: 'land', l: 'Land' },
];

const HERO_BEDS = [
  { v: '', l: 'Any beds' },
  { v: '1', l: '1+' },
  { v: '2', l: '2+' },
  { v: '3', l: '3+' },
  { v: '4', l: '4+' },
];

// Bands match the page the search lands on: Buy and New Projects compare
// USD-equivalent prices, Rent compares USD-equivalent monthly rent. (The hero
// used to compare raw prices, so its bands disagreed with the results page.)
const HERO_PRICES = [
  { v: '', l: 'Any price' },
  { v: '0-250000', l: 'Up to $250k' },
  { v: '250000-500000', l: '$250k – 500k' },
  { v: '500000-1000000', l: '$500k – 1M' },
  { v: '1000000-3000000', l: '$1M – 3M' },
  { v: '3000000-', l: '$3M +' },
];

const HERO_RENTS = [
  { v: '', l: 'Any rent' },
  { v: '0-1500', l: 'Up to $1.5k / mo' },
  { v: '1500-3000', l: '$1.5k – 3k / mo' },
  { v: '3000-6000', l: '$3k – 6k / mo' },
  { v: '6000-12000', l: '$6k – 12k / mo' },
  { v: '12000-', l: '$12k+ / mo' },
];

const HERO_MODES: { v: SearchSection; l: string }[] = [
  { v: 'buy', l: 'Buy' },
  { v: 'rent', l: 'Rent' },
  { v: 'new-projects', l: 'New Projects' },
];

const VALUE_POINTS = [
  { t: 'International market access', d: 'Property in the United Kingdom, Dubai and Pakistan through one team.' },
  { t: 'Residential & commercial', d: 'Homes, offices, retail, industrial space and land.' },
  { t: 'New development opportunities', d: 'Off-plan and new projects, with payment plans where the developer offers them.' },
  { t: 'Property investment support', d: 'Title and encumbrance checks and transaction support through to completion.' },
  { t: 'Local market partners', d: 'On-the-ground representation in each core market.' },
];

// Who the portal is built for — an audience, not a list of named clients.
const CLIENTS = [
  'Diaspora investors',
  'Family offices',
  'Private investors',
  'Developer partners',
];


function portalStats() {
  return [
    { n: '3', l: 'Core Markets' },
    { n: String(portalOffices().length), l: 'CZAAH Offices' },
    { n: '13', l: 'Investment Sectors' },
    { n: 'London', l: 'Headquartered' },
  ];
}

export default function PropertyPortalHome() {
  const router = useRouter();
  const { all: properties, loading, error, reload } = useListings();
  const [q, setQ] = useState('');
  const [hType, setHType] = useState('');
  const [hBeds, setHBeds] = useState('');
  const [hPrice, setHPrice] = useState('');
  const [hDest, setHDest] = useState('');
  const [hPick, setHPick] = useState<Suggestion | null>(null);
  const [hMode, setHMode] = useState<SearchSection>('buy');
  const [testimonial, setTestimonial] = useState(0);
  const [slide, setSlide] = useState(0);
  const [whyMarket, setWhyMarket] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const { currency: currencyPref } = useCurrencyPref();
  const whyInvest = portalWhyInvest();
  const whyCurrent = whyInvest[Math.min(whyMarket, whyInvest.length - 1)];
  const testimonials = portalTestimonials();
  const currentTestimonial = testimonials[Math.min(testimonial, testimonials.length - 1)];

  // The hero reel: project clips uploaded with a listing (newest first), then
  // CZAAH's market footage. Rentals are left out — they live on /rent.
  const heroSlides = useMemo(() => {
    const projectClips = properties
      .filter((p) => !isRental(p) && p.video_url)
      .slice(0, MAX_PROJECT_CLIPS)
      .map((p) => ({
        key: p.id,
        video: p.video_url,
        poster: p.video_poster_url || resolveImage(p.images?.[0]) || '',
      }));
    return [...projectClips, ...portalHeroReel()];
  }, [properties]);

  // Visitors who ask the OS for reduced motion get the still poster instead of
  // autoplaying footage, and the slides stop advancing on their own.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Hero slides rotate on their own; pausing isn't needed since nothing in the
  // slide is interactive beyond the CTA, which is identical on every slide.
  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % Math.max(1, heroSlides.length)), 8000);
    return () => clearInterval(t);
  }, [reduceMotion, heroSlides.length]);

  // Destinations that actually have stock, for the hero bar.
  const destOptions = useMemo(() => {
    const seen = new Map();
    properties.forEach((p) => {
      if (!p.city) return;
      if (!seen.has(p.city)) seen.set(p.city, 0);
      seen.set(p.city, seen.get(p.city) + 1);
    });
    return [...seen.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([city, n]) => ({ city, n }));
  }, [properties]);

  // Headline numbers for the allocator teaser: average yield and entry cost
  // per market, normalised to USD so the three are actually comparable.

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('search', q.trim());
    if (hType) params.set('type', hType);
    if (hBeds && hMode !== 'new-projects') params.set('beds', hBeds);
    if (hPrice) params.set('price', hPrice);
    // A picked suggestion only counts while the box still shows its name.
    const pick = hPick && hPick.label === hDest ? hPick : null;
    router.push(suggestionHref(hMode, pick, hDest, params));
  }


  // The API returns newest-first, so the head of the list IS the latest intake.
  // Featured skips those so the two sections don't show the same properties.
  const showcase = properties.filter((p) => !isRental(p) && resolveImage(p.images?.[0])).slice(0, 4);
  const showcaseIds = new Set(showcase.map((p) => p.id));
  const featured = properties
    .filter((p) => !showcaseIds.has(p.id))
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  const newCount = properties.filter(isNewListing).length;
  const insightTeasers = portalInsights().slice(0, 3);
  const homeLayout = normaliseHomeLayout(portalHomeLayout());

  // Every home section, by key. Hero stays first; the rest follow homeLayout.
  const blocks: Record<HomeSectionKey, React.ReactNode> = {
    markets: (
      <>
          <FeaturedMarkets properties={properties} />
      </>
    ),
    showcase: (
      <>
          {/* Full-viewport panels: scrolling on from the hero keeps every project
              at full-bleed scale rather than dropping straight to small cards. */}
          <section className="pp-showcase" id="latest">
            {showcase.map((p, i) => (
              <article className="pp-show" key={p.id}>
                <div
                  className="pp-show-img"
                  style={{ backgroundImage: `url(${resolveImage(p.images?.[0])})` }}
                  aria-hidden="true"
                />
                <div className="pp-container pp-show-body">
                  <div className="pp-show-panel">
                    <div className="pp-show-index">
                      {String(i + 1).padStart(2, '0')} / {String(showcase.length).padStart(2, '0')}
                    </div>
                    <Link href={`/property-portal/${p.id}`} className="pp-show-title-link">
                      <h2 className="pp-show-title">{p.title}</h2>
                    </Link>
                    <p className="pp-show-loc">
                      {p.location}
                      {p.city ? `, ${p.city}` : ''}
                      {p.country ? `, ${p.country}` : ''}
                    </p>
                    {p.description && <p className="pp-show-desc">{p.description}</p>}
                    <div className="pp-show-stats">
                      <div>
                        <small>Price</small>
                        <b>{formatPrice(p, currencyPref || undefined)}</b>
                      </div>
                      {p.area_sqft != null && (
                        <div>
                          <small>Area</small>
                          <b>{p.area_sqft.toLocaleString()} ft&sup2;</b>
                        </div>
                      )}
                      {p.yield_percentage != null && (
                        <div>
                          <small>{yieldLabel(p.yield_source)}</small>
                          <b>{p.yield_percentage}%</b>
                        </div>
                      )}
                      <div>
                        <small>Type</small>
                        <b>{p.property_type?.replace('_', ' ')}</b>
                      </div>
                    </div>
                    <div className="pp-show-actions">
                      <Link href={`/property-portal/${p.id}`} className="pp-btn pp-btn--gold">
                        View project
                      </Link>
                      <Link
                        href={`/property-portal/contact?ref=${encodeURIComponent(p.title)}`}
                        className="pp-btn pp-btn--glass"
                      >
                        Enquire
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
      </>
    ),
    featured: (
      <>
          <section className="pp-section pp-stats-band">
            <div className="pp-container">
              <div className="pp-section-head">
                <div>
                  <div className="pp-eyebrow">Properties</div>
                  <h2 className="pp-h2">Featured properties</h2>
                </div>
                <Link href="/property-portal/listings" className="pp-link-arrow">
                  View all listings →
                </Link>
              </div>
              <div className="pp-grid">
                {loading &&
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="pp-skeleton" />)}
                {!loading && !error && featured.length === 0 && (
                  <div className="pp-empty">More opportunities are being prepared — check back shortly.</div>
                )}
                {!loading && !error && featured.slice(0, 8).map((prop) => <PropertyCard key={prop.id} prop={prop} />)}
              </div>
            </div>
          </section>
      </>
    ),
    projects: (
      <>
          <DevelopmentStrip eyebrow="New projects" title="New & off-plan projects" viewAllHref="/property-portal/new-projects" />
      </>
    ),
    investments: (
      <>
          <InvestmentOpportunities properties={properties} />
      </>
    ),
    destinations: (
      <>
          <section className="pp-section">
            <div className="pp-container">
              <div className="pp-section-head">
                <div>
                  <div className="pp-eyebrow">Locations</div>
                  <h2 className="pp-h2">Explore by location</h2>
                </div>
                <Link href="/property-portal/destinations" className="pp-link-arrow">
                  All locations →
                </Link>
              </div>
              <p className="pp-section-lead" style={{ marginBottom: 36, maxWidth: 700 }}>
                Start with a city to see what is available there today.
              </p>
              <div className="pp-dest-grid">
                {loading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="pp-skeleton" style={{ height: 300 }} />
                  ))}
                {!loading && !error && destOptions.slice(0, 6).map((d) => {
                  const meta = destinationFor(d.city);
                  const withImg = properties.find((p) => p.city === d.city && p.images?.[0]);
                  const img = withImg ? resolveImage(withImg.images[0]) : null;
                  return (
                    <Link
                      key={d.city}
                      href={`/property-portal/destinations/${slugForCity(d.city)}`}
                      className="pp-dest"
                    >
                      <div className="pp-dest-img">
                        {img ? <img src={img} alt={d.city} loading="lazy" /> : <div className="pp-card-img--empty">⌂</div>}
                        <span className="pp-dest-count">{d.n} {d.n === 1 ? 'property' : 'properties'}</span>
                      </div>
                      <div className="pp-dest-body">
                        <h3>{d.city}</h3>
                        <span className="pp-dest-country">{meta?.country || ''}</span>
                        {meta?.tagline && <p className="pp-dest-tagline">{meta.tagline}</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
      </>
    ),
    about: (
      <>
          <section className="pp-section">
            <div className="pp-container">
              <div className="pp-intro" style={{ alignItems: 'stretch' }}>
                <div>
                  <div className="pp-eyebrow">About CZAAH Properties</div>
                  <h2 className="pp-h2">Why CZAAH Properties</h2>
                  <p className="pp-section-lead">
                    CZAAH Properties is a London-based international property company, part of the
                    CZAAH group. We help people buy, sell, rent and invest in property across the
                    United Kingdom, Dubai and Pakistan, with one point of contact from first viewing to
                    completion.
                  </p>
                  <div style={{ marginTop: 28 }}>
                    <Link href="/sectors/realestate" className="pp-btn pp-btn--ghost">
                      About the Real Estate Sector
                    </Link>
                  </div>
                </div>
                <div className="pp-intro-points">
                  {VALUE_POINTS.map((p) => (
                    <div className="pp-intro-point" key={p.t}>
                      <i>◆</i>
                      <div>
                        <b>{p.t}</b>
                        <span>{p.d}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
      </>
    ),
    whyInvest: (
      <>
          <section className="pp-section pp-stats-band">
            <div className="pp-container">
              <h2 className="pp-h2" style={{ textAlign: 'center', marginBottom: 10 }}>
                Why invest in <span className="pp-gold">{whyCurrent.market}</span>?
              </h2>
              <div className="pp-why-tabs">
                {whyInvest.map((w, i) => (
                  <button
                    key={w.market}
                    type="button"
                    className={i === whyMarket ? 'active' : ''}
                    onClick={() => setWhyMarket(i)}
                  >
                    {w.market}
                  </button>
                ))}
              </div>
              <div className="pp-why-grid">
                {whyCurrent.points.map((p) => (
                  <div className="pp-why-tile" key={p.title}>
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                  </div>
                ))}
              </div>
              <p className="pp-disclaimer" style={{ textAlign: 'center', marginInline: 'auto' }}>
                General information, not investment, tax or legal advice. Tax treatment depends on
                your circumstances and may change; take independent advice before investing.
              </p>
            </div>
          </section>
      </>
    ),
    owner: (
      <>
          <OwnerCta />
      </>
    ),
    clients: (
      <>
          <section className="pp-clients-band">
            <div className="pp-container">
              <div className="pp-eyebrow" style={{ textAlign: 'center', marginBottom: 24 }}>
                Built For
              </div>
              <div className="pp-clients">
                {CLIENTS.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
            </div>
          </section>
      </>
    ),
    testimonials: (
      <>
          {currentTestimonial && (
          <section className="pp-section pp-stats-band">
            <div className="pp-container">
              <div className="pp-eyebrow" style={{ textAlign: 'center' }}>Client Confidence</div>
              <h2 className="pp-h2" style={{ textAlign: 'center', marginBottom: 40 }}>
                What investors say
              </h2>
              <div className="pp-testimonial">
                <p className="pp-testimonial-quote">&ldquo;{currentTestimonial.quote}&rdquo;</p>
                <div className="pp-testimonial-author">{currentTestimonial.author}</div>
                <div className="pp-testimonial-role">{currentTestimonial.role}</div>
                <div className="pp-testimonial-dots">
                  {testimonials.length > 1 && testimonials.map((_, i) => (
                    <button
                      key={i}
                      className={i === testimonial ? 'active' : ''}
                      aria-label={`Testimonial ${i + 1}`}
                      onClick={() => setTestimonial(i)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
          )}
      </>
    ),
    insights: (
      <>
          <section className="pp-section">
            <div className="pp-container">
              <div className="pp-section-head">
                <div>
                  <div className="pp-eyebrow">Insights</div>
                  <h2 className="pp-h2">The market at your fingertips</h2>
                </div>
                <Link href="/property-portal/insights" className="pp-link-arrow">
                  All insights →
                </Link>
              </div>
              <div className="pp-insights-grid pp-insights-grid--home">
                {insightTeasers.map((a) => (
                  <Link key={a.id} href={`/insights#${a.id}`} className="pp-insight-card">
                    <span className="pp-insight-cat">{a.category}</span>
                    <h3>{a.title}</h3>
                    <p>{a.excerpt}</p>
                    <span className="pp-insight-meta">{a.date} →</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
      </>
    ),
    stats: (
      <>
          <section className="pp-section--tight pp-stats-band">
            <div className="pp-container">
              <div className="pp-stats">
                {portalStats().map((s) => (
                  <div className="pp-stat" key={s.l}>
                    <b>{s.n}</b>
                    <span>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
      </>
    ),
    cta: (
      <>
          <section className="pp-cta-band">
            <div className="pp-container">
              <h2 className="pp-h2">Planning a property investment?</h2>
              <p>
                Tell us the market, budget and objective. We&apos;ll come back with a shortlist of
                opportunities and a structuring route.
              </p>
              <div className="pp-cta-actions">
                <Link href="/contact?interest=Real%20Estate#contact-form" className="pp-btn pp-btn--gold">
                  Book a Call
                </Link>
                <Link href="/property-portal/listings" className="pp-btn pp-btn--ghost">
                  Browse Listings
                </Link>
              </div>
            </div>
          </section>
      </>
    ),
  };

  return (
    <main>
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="pp-hero pp-hero--slides">
        <div className="pp-hero-media" aria-hidden="true">
          {heroSlides.map((s, i) => {
            const still = s.poster;
            const media = s.video ? { video: s.video, poster: still } : null;
            const active = i === slide;
            return (
              <div key={s.key} className={`pp-hero-slide${active ? ' is-active' : ''}`}>
                {active && media && !reduceMotion ? (
                  <video
                    className="pp-hero-video"
                    src={media.video}
                    poster={media.poster}
                    autoPlay
                    loop
                    playsInline
                    preload="auto"
                    // React does not reliably emit the `muted` ATTRIBUTE from
                    // the JSX prop, and Chrome blocks autoplay on any video it
                    // does not consider muted — which leaves the hero frozen
                    // on its poster. Set the property directly.
                    ref={(el) => {
                      if (!el) return;
                      el.muted = true;
                      el.defaultMuted = true;
                    }}
                    // play() must wait for data: called at mount (readyState 0)
                    // it resolves but the element stays paused. This also
                    // covers Safari ignoring `autoplay` on a fresh mount.
                    onCanPlay={(e) => {
                      const el = e.currentTarget;
                      el.muted = true;
                      el.play().catch(() => {});
                    }}
                  />
                ) : (
                  <div
                    className="pp-hero-video"
                    style={{
                      backgroundImage: `url(${still})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="pp-container pp-hero-body">
          <div className="pp-hero-bottom">
          <div className="pp-hero-copy">
            <h1>Global Property Investment &amp; Real Estate</h1>
            <p>Buy, sell, rent and invest in property across the United Kingdom, Dubai and Pakistan.</p>
            <div className="pp-hero-ctas">
              <button
                type="button"
                className="pp-btn pp-btn--gold"
                onClick={() => document.querySelector<HTMLInputElement>('#hero-search .pp-locsearch input')?.focus()}
              >
                Search properties
              </button>
              <ButtonLink href="/property-portal/contact" variant="glass">Speak to CZAAH</ButtonLink>
            </div>
          </div>
          <form className="pp-search" id="hero-search" onSubmit={runSearch} role="search" aria-label="Property search">
            <div className="pp-search-modes" role="radiogroup" aria-label="Search for">
              {HERO_MODES.map((m) => (
                <button
                  key={m.v}
                  type="button"
                  role="radio"
                  aria-checked={hMode === m.v}
                  className={hMode === m.v ? 'is-active' : undefined}
                  // Price bands differ between modes, so a chosen band resets.
                  onClick={() => { if (m.v !== hMode) { setHMode(m.v); setHPrice(''); } }}
                >
                  {m.l}
                </button>
              ))}
            </div>
            <div className="pp-searchbar">
              <div className="pp-searchbar-field pp-searchbar-field--loc">
                <span aria-hidden="true">Location</span>
                <LocationSearch
                  value={hDest}
                  onChange={(t) => { setHDest(t); if (hPick && t !== hPick.label) setHPick(null); }}
                  onPick={(sug) => setHPick(sug)}
                  placeholder="City, area or development"
                />
              </div>
              <label className="pp-searchbar-field">
                <span>Property type</span>
                <select value={hType} onChange={(e) => setHType(e.target.value)}>
                  {HERO_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </label>
              {hMode !== 'new-projects' && (
              <label className="pp-searchbar-field">
                <span>Bedrooms</span>
                <select value={hBeds} onChange={(e) => setHBeds(e.target.value)}>
                  {HERO_BEDS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
                </select>
              </label>
              )}
              <label className="pp-searchbar-field">
                <span>{hMode === 'rent' ? 'Monthly rent' : 'Price range'}</span>
                <select value={hPrice} onChange={(e) => setHPrice(e.target.value)}>
                  {(hMode === 'rent' ? HERO_RENTS : HERO_PRICES).map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
              </label>
              <button type="submit" className="pp-searchbar-go">
                Search properties
              </button>
            </div>
          </form>

          <div className="pp-hero-dots">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={i === slide ? 'is-active' : ''}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setSlide(i)}
              />
            ))}
          </div>
          </div>

          {error && (
            <p className="pp-hero-error">
              Listings are temporarily unavailable.{' '}
              <button type="button" className="pp-retry" onClick={reload}>Try again</button>
            </p>
          )}
        </div>
      </section>
      {/* Sections under the hero, in the order set in Admin → Homepage. */}
      {homeLayout.filter((sec) => sec.visible).map((sec) => <Fragment key={sec.key}>{blocks[sec.key]}</Fragment>)}

    </main>
  );
}
