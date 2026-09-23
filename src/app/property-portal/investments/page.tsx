'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { PropertyCard } from '../_components/PropertyCard';
import { useListings } from '../_components/useListings';
import { portalLocations } from '../_components/portalRuntime';
import { isRental } from '../_components/types';
import { investmentCategories, INCOME_HREF } from './categories';
import { locationHref } from '../_components/locationNav';
import { ButtonLink, EmptyState, Skeleton } from '../_components/ui';
import { InvestmentEnquiry } from '../_components/InvestmentEnquiry';

// /investments (brief §8). Every category and count comes from live listings,
// a category with nothing in it is left out, and yields are only ever the
// figure supplied with a listing, labelled with its source on the card.

const STEPS = [
  { t: 'Tell us what you are looking for', d: 'Budget, market, property type and what the investment is for.' },
  { t: 'We shortlist', d: 'The CZAAH Properties team sends you listings and projects that match.' },
  { t: 'View and check', d: 'Arrange viewings, and take independent legal, tax and financial advice before committing.' },
  { t: 'Decide in your own time', d: 'No obligation — you choose whether and when to proceed.' },
];

export default function InvestmentsPage() {
  const { all, loading, error, reload } = useListings();
  const countries = useMemo(() => (portalLocations() || []).flatMap((r) => r.countries), []);
  const categories = useMemo(() => investmentCategories(all), [all]);
  const withYield = useMemo(
    () => all.filter((p) => !isRental(p) && p.yield_percentage != null).sort((a, b) => (b.yield_percentage || 0) - (a.yield_percentage || 0)).slice(0, 6),
    [all],
  );
  const markets = useMemo(
    () => countries.map((c) => ({ c, n: all.filter((p) => !isRental(p) && (p.country || '').trim().toLowerCase() === c.name.toLowerCase()).length })),
    [countries, all],
  );
  const names = countries.map((c) => c.name);
  const marketList = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || '';

  return (
    <main>
      <section className="pp-hero pp-hero--compact">
        <div className="pp-container">
          <div className="pp-eyebrow">CZAAH Properties · Investments</div>
          <h1>Property <span className="pp-gold">investment.</span></h1>
          <p className="pp-hero-lede">
            Residential, commercial, off-plan and income-producing property{marketList ? ` in ${marketList}` : ''}.
            Tell us what you are looking for and the CZAAH Properties team will come back with options.
          </p>
          <div className="pp-cta-actions" style={{ justifyContent: 'flex-start' }}>
            <ButtonLink href="#investment-enquiry">Make an investment enquiry</ButtonLink>
            <ButtonLink href={INCOME_HREF} variant="ghost">Income-producing listings</ButtonLink>
          </div>
        </div>
      </section>

      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / Investments
        </div>

        <section className="pp-section" style={{ paddingTop: 20 }}>
          <div className="pp-section-head">
            <div>
              <div className="pp-eyebrow">Opportunities</div>
              <h2 className="pp-h2">By type</h2>
            </div>
          </div>
          {loading ? (
            <div className="pp-invest-tiles">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={120} />)}</div>
          ) : error ? (
            <EmptyState title="We couldn't load the listings just now" action={<button type="button" className="pp-retry" onClick={reload}>Try again</button>}>{error}</EmptyState>
          ) : (
            <div className="pp-invest-tiles">
              {categories.map((x) => (
                <Link key={x.t} href={x.href} className="pp-invest-tile">
                  <strong>{x.t}</strong>
                  <span>{x.d}</span>
                  <em>{x.n} {x.n === 1 ? 'listing' : 'listings'} →</em>
                </Link>
              ))}
              <Link href="/property-portal/new-projects" className="pp-invest-tile">
                <strong>New developments</strong>
                <span>Projects presented by their developers, with units and payment plans.</span>
                <em>View projects →</em>
              </Link>
            </div>
          )}
        </section>

        {markets.length > 0 && (
          <section className="pp-section" style={{ paddingTop: 0 }}>
            <div className="pp-section-head">
              <div>
                <div className="pp-eyebrow">International</div>
                <h2 className="pp-h2">By market</h2>
              </div>
              <Link href="/property-portal/allocator" className="pp-link-arrow">Compare markets →</Link>
            </div>
            <div className="pp-invest-tiles">
              {markets.map(({ c, n }) => (
                <Link key={c.id} href={locationHref('buy', c)} className="pp-invest-tile">
                  <strong>{c.name}</strong>
                  <span>{c.tagline || `Property for sale in ${c.cities.slice(0, 3).map((x) => x.name).join(', ') || c.name}.`}</span>
                  <em>{loading ? 'Loading…' : `${n} ${n === 1 ? 'property' : 'properties'} for sale →`}</em>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && !error && withYield.length > 0 && (
          <section className="pp-section" style={{ paddingTop: 0 }}>
            <div className="pp-section-head">
              <div>
                <div className="pp-eyebrow">Income-producing</div>
                <h2 className="pp-h2">Listings with a stated yield</h2>
              </div>
              <Link href={INCOME_HREF} className="pp-link-arrow">See all →</Link>
            </div>
            <div className="pp-grid">
              {withYield.map((p) => <PropertyCard key={p.id} prop={p} />)}
            </div>
          </section>
        )}

        <section className="pp-section" style={{ paddingTop: 0 }}>
          <div className="pp-intro" style={{ alignItems: 'start' }}>
            <div>
              <div className="pp-eyebrow">How it works</div>
              <ol className="pp-sell-steps">
                {STEPS.map((s) => (
                  <li key={s.t}><strong>{s.t}</strong><span>{s.d}</span></li>
                ))}
              </ol>
              <div className="pp-invest-risk" role="note">
                <h3>Important information</h3>
                <p>
                  Property values and rental income can fall as well as rise, and you may get back less
                  than you invest. Any yield shown is the figure supplied for that listing, labelled with
                  its source — it is not a forecast, and no return is guaranteed. Buying abroad can also
                  involve currency movements, local taxes and ownership rules. Take independent legal,
                  tax and financial advice before investing.
                </p>
              </div>
            </div>
            <div className="pp-enquire-card" id="investment-enquiry" style={{ scrollMarginTop: 110 }}>
              <InvestmentEnquiry />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
