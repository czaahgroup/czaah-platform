'use client';
// @ts-nocheck

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PropertyCard } from './_components/PropertyCard';
import { portalInsights } from './_components/insights-data';
import { useListings } from './_components/useListings';
import { portalHeroReel } from './_components/portalRuntime';
import { isNewListing, NEW_LISTING_DAYS, resolveImage, convertPrice, formatPrice, isRental } from './_components/types';
import { useCurrencyPref } from './_components/usePortalPrefs';
import { WHY_INVEST } from './_components/portal-content';
import { destinationFor, slugForCity } from './_components/destinations';


const MARKETS = [
  {
    key: 'london',
    name: 'London',
    blurb: 'Grade-A commercial floors, mixed-use blocks and prime residential across the City, Canary Wharf and the West End — freehold and long-leasehold.',
  },
  {
    key: 'dubai',
    name: 'Dubai',
    blurb: 'Freehold offices, off-plan residential and income-producing units in Business Bay, Downtown and Dubai South — tax-free returns with structured payment plans.',
  },
  {
    key: 'pakistan',
    name: 'Pakistan',
    blurb: 'Commercial, industrial and Special Economic Zone assets across Islamabad, Lahore, Karachi and the CPEC corridor — CZAAH-vetted with local partners on the ground.',
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

const HERO_PRICES = [
  { v: '', l: 'Any price' },
  { v: '0-250000', l: 'Up to 250k' },
  { v: '250000-500000', l: '250k – 500k' },
  { v: '500000-1000000', l: '500k – 1M' },
  { v: '1000000-3000000', l: '1M – 3M' },
  { v: '3000000-', l: '3M +' },
];

const VALUE_POINTS = [
  { t: 'Title-verified', d: 'Every listing is checked for clean title and encumbrances before it reaches the portal.' },
  { t: 'Local partners', d: 'On-the-ground representation in each market — not a remote listings feed.' },
  { t: 'One counterparty', d: 'Structuring, due diligence and transaction support handled end-to-end by CZAAH.' },
  { t: 'Investor-grade data', d: 'Yield, area and pricing stated up front so you can compare like for like.' },
];

const CLIENTS = [
  'Gulf Family Offices',
  'Diaspora HNWIs',
  'Institutional Funds',
  'Sovereign Investors',
  'Developer Partners',
  'Private Investors',
];

// Anonymised client testimonials — the same ones CZAAH publishes on czaah.com,
// filtered to the real-estate-relevant quotes.
const TESTIMONIALS = [
  {
    quote:
      'As overseas Pakistanis, finding transparent, structured real estate investment access was impossible — until CZAAH. Their institutional structure gave us the security we needed.',
    author: 'Private Investor',
    role: 'UK-based Diaspora HNWI',
  },
  {
    quote:
      "CZAAH's cross-party political coverage means our investments are protected regardless of which government is in power. That level of continuity is unmatched.",
    author: 'Managing Director',
    role: 'Saudi Family Office',
  },
  {
    quote:
      'What sets CZAAH apart is their institutional discipline. Clean documentation, transparent reporting, and a compliance standard you rarely see in frontier markets.',
    author: 'Portfolio Manager',
    role: 'London-based PE Fund',
  },
];

const STATS = [
  { n: '3', l: 'Core Markets' },
  { n: '5', l: 'CZAAH Offices' },
  { n: '13', l: 'Investment Sectors' },
  { n: 'London', l: 'Headquartered' },
];

export default function PropertyPortalHome() {
  const router = useRouter();
  const { all: properties, loading, error, reload } = useListings();
  const [q, setQ] = useState('');
  const [hType, setHType] = useState('');
  const [hBeds, setHBeds] = useState('');
  const [hPrice, setHPrice] = useState('');
  const [hDest, setHDest] = useState('');
  const [testimonial, setTestimonial] = useState(0);
  const [slide, setSlide] = useState(0);
  const [whyMarket, setWhyMarket] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const { currency: currencyPref } = useCurrencyPref();

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
  const allocPreview = useMemo(() => {
    const by = new Map<string, { psf: number[]; y: number[] }>();
    properties.forEach((p) => {
      if (isRental(p) || !p.country || !p.price || !p.area_sqft) return;
      const usd = p.currency === 'USD' ? p.price : convertPrice(p.price, p.currency, 'USD');
      if (usd == null || usd <= 0) return;
      if (!by.has(p.country)) by.set(p.country, { psf: [], y: [] });
      const e = by.get(p.country)!;
      e.psf.push(usd / p.area_sqft);
      if (p.yield_percentage != null) e.y.push(p.yield_percentage);
    });
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    return [...by.entries()]
      .filter(([, v]) => v.y.length > 0)
      .map(([country, v]) => ({
        country,
        yieldPct: avg(v.y),
        psf: `USD ${Math.round(avg(v.psf)).toLocaleString()}`,
      }))
      .sort((a, b) => b.yieldPct - a.yieldPct)
      .slice(0, 3);
  }, [properties]);

  // Live count for the hero CTA — mirrors exactly the filtering the listings
  // page will apply, so "Show N results" never over-promises.
  const heroMatches = useMemo(() => {
    const term = q.trim().toLowerCase();
    return properties.filter((p) => {
      if (hDest && p.city !== hDest) return false;
      if (hType && p.property_type !== hType) return false;
      if (hBeds && (p.bedrooms ?? -1) < Number(hBeds)) return false;
      if (hPrice) {
        // The hero's bands are purchase prices; a monthly rent never matches.
        if (isRental(p)) return false;
        const [min, max] = hPrice.split('-');
        if (min && (p.price ?? 0) < Number(min)) return false;
        if (max && (p.price ?? 0) > Number(max)) return false;
      }
      if (term) {
        const hay = `${p.title} ${p.location} ${p.city} ${p.country} ${p.description}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    }).length;
  }, [properties, q, hType, hBeds, hPrice, hDest]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('search', q.trim());
    if (hType) params.set('type', hType);
    if (hBeds) params.set('beds', hBeds);
    if (hPrice) params.set('price', hPrice);
    // A destination on its own is a browse intent, not a filter — send
    // them to the destination page rather than a filtered flat list.
    if (hDest) {
      const onlyDest = !q.trim() && !hType && !hBeds && !hPrice;
      const slug = slugForCity(hDest);
      if (onlyDest && slug) {
        router.push(`/property-portal/destinations/${slug}`);
        return;
      }
      params.set('search', hDest);
    }
    router.push(`/property-portal/listings?${params.toString()}`);
  }

  // The API returns newest-first, so the head of the list IS the latest intake.
  // Featured skips those so the two sections don't show the same properties.
  const showcase = properties.filter((p) => !isRental(p) && resolveImage(p.images?.[0])).slice(0, 4);
  const showcaseIds = new Set(showcase.map((p) => p.id));
  const featured = properties.filter((p) => !showcaseIds.has(p.id));
  const newCount = properties.filter(isNewListing).length;
  const insightTeasers = portalInsights().slice(0, 3);

  return (
    <main>      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="pp-hero pp-hero--slides">
        {/* The hero is visual (slides + search); this names the page for
            search engines and screen readers without changing the design. */}
        <h1 className="pp-sr-only">CZAAH Property — real estate to buy and rent in London, Dubai and Pakistan</h1>
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
          <form className="pp-search" onSubmit={runSearch}>
            <div className="pp-searchbar">
              <label className="pp-searchbar-field">
                <span>Destination</span>
                <select value={hDest} onChange={(e) => setHDest(e.target.value)}>
                  <option value="">Anywhere</option>
                  {destOptions.map((d) => (
                    <option key={d.city} value={d.city}>{d.city} ({d.n})</option>
                  ))}
                </select>
              </label>
              <label className="pp-searchbar-field">
                <span>Property type</span>
                <select value={hType} onChange={(e) => setHType(e.target.value)}>
                  {HERO_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </label>
              <label className="pp-searchbar-field">
                <span>Bedrooms</span>
                <select value={hBeds} onChange={(e) => setHBeds(e.target.value)}>
                  {HERO_BEDS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
                </select>
              </label>
              <label className="pp-searchbar-field">
                <span>Price range</span>
                <select value={hPrice} onChange={(e) => setHPrice(e.target.value)}>
                  {HERO_PRICES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
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
      {/* ── PROJECT SHOWCASE ───────────────────────────────── */}
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
                      <small>Yield</small>
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

      {/* ── DESTINATIONS ───────────────────────────────────── */}
      <section className="pp-section">
        <div className="pp-container">
          <div className="pp-section-head">
            <div>
              <div className="pp-eyebrow">Where We Operate</div>
              <h2 className="pp-h2">Explore by destination</h2>
            </div>
            <Link href="/property-portal/destinations" className="pp-link-arrow">
              All destinations →
            </Link>
          </div>
          <p className="pp-section-lead" style={{ marginBottom: 36, maxWidth: 700 }}>
            Each market is covered by a local CZAAH partner. Start with a place to see what we
            hold there and why it earns its position.
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
                    <h2>{d.city}</h2>
                    <span className="pp-dest-country">{meta?.country || ''}</span>
                    {meta?.tagline && <p className="pp-dest-tagline">{meta.tagline}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>      {/* ── ALLOCATOR ──────────────────────────────────────── */}
      <section className="pp-section pp-alloc-band">
        <div className="pp-container">
          <div className="pp-alloc-promo">
            <div>
              <div className="pp-eyebrow">Cross-market comparison</div>
              <h2 className="pp-h2">Where should your capital go?</h2>
              <p className="pp-section-lead">
                Every other property portal asks which unit you want. That&apos;s the second
                question. The first is which market your money belongs in — and because we
                transact in all of ours, we can answer it with the same numbers on every side.
              </p>
              <Link href="/property-portal/allocator" className="pp-btn pp-btn--gold">
                Compare our markets
              </Link>
            </div>
            <div className="pp-alloc-promo-stats">
              {allocPreview.map((a) => (
                <div key={a.country}>
                  <span className="pp-alloc-promo-num">{a.yieldPct.toFixed(1)}%</span>
                  <small>{a.country}</small>
                  <em>{a.psf} / ft&sup2;</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY INVEST ─────────────────────────────────────── */}
      <section className="pp-section pp-stats-band">
        <div className="pp-container">
          <h2 className="pp-h2" style={{ textAlign: 'center', marginBottom: 10 }}>
            Why invest in <span className="pp-gold">{WHY_INVEST[whyMarket].market}</span>?
          </h2>
          <div className="pp-why-tabs">
            {WHY_INVEST.map((w, i) => (
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
            {WHY_INVEST[whyMarket].points.map((p) => (
              <div className="pp-why-tile" key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── FEATURED LISTINGS ──────────────────────────────── */}
      <section className="pp-section pp-stats-band">
        <div className="pp-container">
          <div className="pp-section-head">
            <div>
              <div className="pp-eyebrow">Selected</div>
              <h2 className="pp-h2">Featured opportunities</h2>
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
            {!loading && !error && featured.map((prop) => <PropertyCard key={prop.id} prop={prop} />)}
          </div>
        </div>
      </section>
      {/* ── ABOUT BAND ─────────────────────────────────────── */}
      <section className="pp-section">
        <div className="pp-container">
          <div className="pp-intro" style={{ alignItems: 'stretch' }}>
            <div>
              <div className="pp-eyebrow">Over a decade of CZAAH</div>
              <h2 className="pp-h2">Institutional discipline, applied to property.</h2>
              <p className="pp-section-lead">
                CZAAH Property is the real estate arm of CZAAH&apos;s international investment
                facilitation group. We source, verify and structure opportunities so overseas
                investors can commit capital across borders with the same rigour they would
                expect at home — one point of contact, from first viewing to completion.
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
      {/* ── CLIENTS STRIP ──────────────────────────────────── */}
      <section className="pp-clients-band">
        <div className="pp-container">
          <div className="pp-eyebrow" style={{ textAlign: 'center', marginBottom: 24 }}>
            Who We Act For
          </div>
          <div className="pp-clients">
            {CLIENTS.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      </section>
      {/* ── TESTIMONIALS ───────────────────────────────────── */}
      <section className="pp-section pp-stats-band">
        <div className="pp-container">
          <div className="pp-eyebrow" style={{ textAlign: 'center' }}>Client Confidence</div>
          <h2 className="pp-h2" style={{ textAlign: 'center', marginBottom: 40 }}>
            What investors say
          </h2>
          <div className="pp-testimonial">
            <p className="pp-testimonial-quote">&ldquo;{TESTIMONIALS[testimonial].quote}&rdquo;</p>
            <div className="pp-testimonial-author">{TESTIMONIALS[testimonial].author}</div>
            <div className="pp-testimonial-role">{TESTIMONIALS[testimonial].role}</div>
            <div className="pp-testimonial-dots">
              {TESTIMONIALS.map((_, i) => (
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
      {/* ── INSIGHTS TEASER ────────────────────────────────── */}
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
      {/* ── STATS BAND ─────────────────────────────────────── */}
      <section className="pp-section--tight pp-stats-band">
        <div className="pp-container">
          <div className="pp-stats">
            {STATS.map((s) => (
              <div className="pp-stat" key={s.l}>
                <b>{s.n}</b>
                <span>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="pp-cta-band">
        <div className="pp-container">
          <h2 className="pp-h2">Planning a property investment?</h2>
          <p>
            Tell us the market, budget and objective. We&apos;ll come back with a shortlist of
            title-verified opportunities and a structuring route.
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
    </main>
  );
}
