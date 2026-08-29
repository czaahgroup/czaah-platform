'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PropertyCard } from './_components/PropertyCard';
import { LiveProperty } from './_components/types';
import { INSIGHTS } from './_components/insights-data';


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
  const [properties, setProperties] = useState<LiveProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [q, setQ] = useState('');
  const [testimonial, setTestimonial] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          '/api/public/properties?countries=' +
            encodeURIComponent('Pakistan,United Kingdom,United Arab Emirates')
        );
        const json = await res.json();
        if (res.ok) setProperties(json.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('search', q.trim());
    params.set('listing_type', listingType);
    router.push(`/property-portal/listings?${params.toString()}`);
  }

  const featured = properties.slice(0, 6);
  const insightTeasers = INSIGHTS.slice(0, 3);

  return (
    <main>
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="pp-hero">
        <div className="pp-container">
          <div className="pp-eyebrow">CZAAH Property Portal</div>
          <h1>
            Property investment across{' '}
            <span className="pp-gold">London, Dubai &amp; Pakistan.</span>
          </h1>
          <p className="pp-hero-lede">
            Your property partner across London, Dubai and Pakistan — pre-vetted, title-verified
            opportunities with structured access and end-to-end transaction support from a
            single institutional counterparty.
          </p>

          <form className="pp-search" onSubmit={runSearch}>
            <div className="pp-search-toggle">
              <button
                type="button"
                className={listingType === 'sale' ? 'active' : ''}
                onClick={() => setListingType('sale')}
              >
                For Sale
              </button>
              <button
                type="button"
                className={listingType === 'rent' ? 'active' : ''}
                onClick={() => setListingType('rent')}
              >
                For Rent
              </button>
            </div>
            <div className="pp-search-row">
              <input
                type="text"
                placeholder="Search by city, area or project…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit">Search</button>
            </div>
          </form>

          <div className="pp-hero-stats">
            <div>
              <span>{loading ? '—' : properties.length}</span>
              <small>Live Listings</small>
            </div>
            <div>
              <span>3</span>
              <small>Markets</small>
            </div>
            <div>
              <span>1</span>
              <small>Counterparty</small>
            </div>
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

      {/* ── FEATURED LISTINGS ──────────────────────────────── */}
      <section className="pp-section pp-stats-band">
        <div className="pp-container">
          <div className="pp-section-head">
            <div>
              <div className="pp-eyebrow">The Latest</div>
              <h2 className="pp-h2">Featured opportunities</h2>
            </div>
            <Link href="/property-portal/listings" className="pp-link-arrow">
              View all listings →
            </Link>
          </div>
          <div className="pp-grid">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="pp-skeleton" />)}
            {!loading && featured.length === 0 && (
              <div className="pp-empty">No listings are live right now — check back shortly.</div>
            )}
            {!loading && featured.map((prop) => <PropertyCard key={prop.id} prop={prop} />)}
          </div>
        </div>
      </section>

      {/* ── MARKETS ────────────────────────────────────────── */}
      <section className="pp-section">
        <div className="pp-container">
          <div className="pp-eyebrow">Where We Operate</div>
          <h2 className="pp-h2">Three markets, one desk.</h2>
          <p className="pp-section-lead" style={{ marginBottom: 40 }}>
            Each market is covered by a local CZAAH partner. Filter the portal by market, or
            speak to the team about a specific city or asset class.
          </p>
          <div className="pp-markets">
            {MARKETS.map((m) => (
              <div className="pp-market" key={m.key}>
                <h3>{m.name}</h3>
                <p>{m.blurb}</p>
                <Link href={`/property-portal/listings?market=${m.key}`} className="pp-link-arrow">
                  View {m.name} listings →
                </Link>
              </div>
            ))}
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

      {/* ── MARKET NOTES CTA ───────────────────────────────── */}
      <section className="pp-section--tight">
        <div className="pp-container">
          <div className="pp-report">
            <div>
              <div className="pp-eyebrow">CZAAH Research</div>
              <h2 className="pp-h2" style={{ marginBottom: 12 }}>
                Property market analysis, quarter by quarter.
              </h2>
              <p className="pp-section-lead">
                Where values are moving across London, Dubai and Pakistan — and the policy
                shifts behind them. Read the latest from the CZAAH research desk.
              </p>
            </div>
            <Link href="/property-portal/insights" className="pp-btn pp-btn--gold">
              Read the Insights
            </Link>
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
