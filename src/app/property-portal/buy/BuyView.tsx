'use client';
// @ts-nocheck

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PropertyCard } from '../_components/PropertyCard';
import { SaveSearchButton } from '../_components/SaveSearchButton';
import { matchesMarket, CURRENCIES, isRental, convertPrice } from '../_components/types';
import { portalLocations } from '../_components/portalRuntime';
import { resolveLocation, inLocation, locationLabel, locationHref } from '../_components/locationNav';
import { LocationChips } from '../_components/LocationChips';
import { LocationSearch, suggestionHref } from '../_components/LocationSearch';
import { MarketFilters } from '../_components/MarketFilters';
import { marketFiltersFor, applyMarketFilters } from '@/lib/marketFields';
import { useListings } from '../_components/useListings';


const PAGE_SIZE = 9;

const TYPES = [
  { v: '', l: 'Any type' },
  { v: 'residential', l: 'Residential' },
  { v: 'commercial', l: 'Commercial' },
  { v: 'industrial', l: 'Industrial' },
  { v: 'mixed_use', l: 'Mixed Use' },
  { v: 'land', l: 'Land' },
];

const BEDS = [
  { v: '', l: 'Any beds' },
  { v: '0', l: 'Studio' },
  { v: '1', l: '1+' },
  { v: '2', l: '2+' },
  { v: '3', l: '3+' },
  { v: '4', l: '4+' },
];

// Bands are in USD. Listings are priced in PKR, AED and GBP, so each price is
// converted first — otherwise a PKR 60M house lands in the "3M+" band.
const PRICES = [
  { v: '', l: 'Any price' },
  { v: '0-250000', l: 'Up to $250k' },
  { v: '250000-500000', l: '$250k – 500k' },
  { v: '500000-1000000', l: '$500k – 1M' },
  { v: '1000000-3000000', l: '$1M – 3M' },
  { v: '3000000-', l: '$3M +' },
];

const STAGES = [
  { v: '', l: 'Ready & off-plan' },
  { v: 'sale', l: 'Ready to buy' },
  { v: 'off_plan', l: 'Off-plan' },
];

const SORTS = [
  { v: 'newest', l: 'Newest' },
  { v: 'price-asc', l: 'Price: low to high' },
  { v: 'price-desc', l: 'Price: high to low' },
  { v: 'ppsf-asc', l: 'Price per ft²: lowest' },
  { v: 'yield-desc', l: 'Yield: high to low' },
];

/** Approximate USD value, for comparing across markets. */
const usd = (p) => (p.price ? convertPrice(p.price, p.currency, 'USD') ?? p.price : null);

function BuyInner({ countrySlug, citySlug }: { countrySlug?: string; citySlug?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  // /buy/<country>/<city> — resolved against Admin → Locations.
  const loc = resolveLocation(portalLocations(), countrySlug, citySlug);
  const basePath = locationHref('buy', loc?.country, loc?.city);
  // Market-specific filters appear once a country is chosen (brief §5).
  const marketFilters = marketFiltersFor(loc?.country.code, 'buy');

  const { all, loading, error, reload } = useListings();

  const market = params.get('market') || 'all';
  const search = params.get('search') || '';
  const type = params.get('type') || '';
  const beds = params.get('beds') || '';
  const price = params.get('price') || '';
  const stage = params.get('stage') || '';
  const sort = params.get('sort') || 'newest';
  const ccy = params.get('ccy') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  function setParam(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    if (!('page' in patch)) next.delete('page');
    router.push(`${basePath}?${next.toString()}`);
  }

  const visible = useMemo(() => {
    // Everything with a purchase price: completed stock and off-plan.
    let list = all.filter((p) => !isRental(p));
    if (stage) list = list.filter((p) => p.listing_type === stage);
    list = list.filter((p) => matchesMarket(p, market));
    list = list.filter((p) => inLocation(p, loc));
    list = applyMarketFilters(list, marketFilters, params);
    if (type) list = list.filter((p) => p.property_type === type);
    if (beds) list = list.filter((p) => (p.bedrooms ?? -1) >= Number(beds));
    if (price) {
      const [min, max] = price.split('-');
      if (min) list = list.filter((p) => (usd(p) ?? -1) >= Number(min));
      if (max) list = list.filter((p) => usd(p) != null && usd(p) <= Number(max));
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(s) ||
          p.location?.toLowerCase().includes(s) ||
          p.city?.toLowerCase().includes(s) ||
          p.country?.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s)
      );
    }
    const sorted = [...list];
    // "Price on request" (and unknown size, for price/ft²) sinks to the bottom.
    const by = (key, dir) => (a, b) => {
      const va = key(a), vb = key(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      return dir * (va - vb);
    };
    const ppsf = (p) => (usd(p) != null && p.area_sqft ? usd(p) / p.area_sqft : null);
    if (sort === 'price-asc') sorted.sort(by(usd, 1));
    if (sort === 'price-desc') sorted.sort(by(usd, -1));
    if (sort === 'ppsf-asc') sorted.sort(by(ppsf, 1));
    if (sort === 'yield-desc') sorted.sort(by((p) => p.yield_percentage, -1));
    return sorted;
  }, [all, market, loc, type, beds, stage, price, search, sort, params]);

  const hasFilters = !!(search || type || beds || stage || price || (market && market !== 'all') || marketFilters.some((f) => params.get(f.param)));
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main>
      {/* Intro */}
      <section className="pp-hero pp-hero--compact">
        <div className="pp-container">
          <div className="pp-eyebrow">CZAAH Properties</div>
          <h1>
            {loc ? <>Property for sale in <span className="pp-gold">{locationLabel(loc)}</span></> : <>Property <span className="pp-gold">to buy.</span></>}
          </h1>
          <p className="pp-hero-lede">
            Ready homes, commercial space and off-plan projects across the United Kingdom,
            Dubai and Pakistan, with one team handling the purchase from first viewing to
            completion.
          </p>
        </div>
      </section>

      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> /{' '}
          {loc ? <Link href={locationHref('buy')}>Buy</Link> : 'Buy'}
          {loc && (loc.city ? (
            <> / <Link href={locationHref('buy', loc.country)}>{loc.country.name}</Link> / {loc.city.name}</>
          ) : (
            <> / {loc.country.name}</>
          ))}
        </div>

        <div className="pp-listpage-head" style={{ paddingTop: 18 }}>
          <div className="pp-listpage-meta">
            <span>{loading ? 'Loading…' : error ? 'Unavailable' : `${visible.length} ${visible.length === 1 ? 'property' : 'properties'}`}</span>
            <SaveSearchButton />
            <label>
              Sort:{' '}
              <select value={sort} onChange={(e) => setParam({ sort: e.target.value })}>
                {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </label>
            <label>
              Currency:{' '}
              <select value={ccy} onChange={(e) => setParam({ ccy: e.target.value })}>
                <option value="">As listed</option>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </div>

        <LocationChips section="buy" loc={loc} />

        <form
          className="pp-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ search: searchInput.trim() });
          }}
        >
          <LocationSearch
            value={searchInput}
            onChange={setSearchInput}
            label="Search location, area or project"
            placeholder="Search city, area, project or developer…"
            onPick={(s) => {
              const carry = new URLSearchParams(params.toString());
              carry.delete('page');
              router.push(suggestionHref('buy', s, '', carry));
            }}
            onSubmitText={(text) => setParam({ search: text.trim() })}
          />
          <select aria-label="Property type" value={type} onChange={(e) => setParam({ type: e.target.value })}>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <select aria-label="Bedrooms" value={beds} onChange={(e) => setParam({ beds: e.target.value })}>
            {BEDS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
          </select>
          <select aria-label="Price range" value={price} onChange={(e) => setParam({ price: e.target.value })}>
            {PRICES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <select aria-label="Construction stage" value={stage} onChange={(e) => setParam({ stage: e.target.value })}>
            {STAGES.map((st) => <option key={st.v} value={st.v}>{st.l}</option>)}
          </select>
          <button type="submit">Search</button>
          {hasFilters && (
            <button
              type="button"
              className="pp-filters-reset"
              onClick={() => router.push(basePath)}
            >
              Reset
            </button>
          )}
        </form>

        {loc && (
          <MarketFilters
            filters={marketFilters}
            listings={all.filter((p) => inLocation(p, loc))}
            params={params}
            onChange={setParam}
            marketName={loc.country.name}
          />
        )}

        <div className="pp-listpage-grid">
          <div className="pp-grid">
            {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="pp-skeleton" />)}
            {!loading && error && (
              <div className="pp-empty">
                We couldn&apos;t load the properties just now.{' '}
                <button type="button" className="pp-retry" onClick={reload}>Try again</button>
                <span className="pp-empty-detail">{error}</span>
              </div>
            )}
            {!loading && !error && visible.length === 0 && (
              hasFilters ? (
                <div className="pp-empty">
                  No properties match these filters.{' '}
                  <Link href={basePath} className="pp-gold">Clear filters</Link>
                </div>
              ) : (
                <div className="pp-empty">
                  New properties are being added. Tell us what you&apos;re looking for and we&apos;ll
                  match you before it lists.{' '}
                  <Link href="/property-portal/contact" className="pp-gold">Get in touch</Link>
                </div>
              )
            )}
            {!loading && !error && paged.map((prop) => (
              <PropertyCard key={prop.id} prop={prop} displayCurrency={ccy || undefined} />
            ))}
          </div>

          {!loading && !error && totalPages > 1 && (
            <div className="pp-pager">
              <button disabled={currentPage <= 1} onClick={() => setParam({ page: String(currentPage - 1) })}>← Prev</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={currentPage === i + 1 ? 'active' : ''}
                  onClick={() => setParam({ page: String(i + 1) })}
                >
                  {i + 1}
                </button>
              ))}
              <button disabled={currentPage >= totalPages} onClick={() => setParam({ page: String(currentPage + 1) })}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export function BuyView({ countrySlug, citySlug }: { countrySlug?: string; citySlug?: string } = {}) {
  return (
    <Suspense fallback={<main><div className="pp-container"><div className="pp-listpage-grid"><div className="pp-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="pp-skeleton" />)}</div></div></div></main>}>
      <BuyInner countrySlug={countrySlug} citySlug={citySlug} />
    </Suspense>
  );
}
