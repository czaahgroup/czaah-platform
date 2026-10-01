'use client';
// @ts-nocheck

import { filterListings } from '@/lib/listingSearch';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PropertyCard } from '../_components/PropertyCard';
import { SaveSearchButton } from '../_components/SaveSearchButton';
import { matchesMarket, CURRENCIES, isRental, convertPrice } from '../_components/types';
import { portalLocations, portalSettings } from '../_components/portalRuntime';
import { resolveLocation, inLocation, locationLabel, locationHref } from '../_components/locationNav';
import { LocationChips } from '../_components/LocationChips';
import { LocationSearch, suggestionHref } from '../_components/LocationSearch';
import { MarketFilters } from '../_components/MarketFilters';
import { marketFiltersFor, applyMarketFilters } from '@/lib/marketFields';
import { useListings } from '../_components/useListings';
import { PriceRange } from '../_components/PriceRange';
import { NoResults } from '../_components/ui';
import { ListingsMap, ViewToggle } from '../_components/ListingsMap';
import { track } from '../_components/analytics';


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

// Offered only when at least one listing states its bathrooms.
const BATHS = [
  { v: '', l: 'Any baths' },
  { v: '1', l: '1+ bath' },
  { v: '2', l: '2+ baths' },
  { v: '3', l: '3+ baths' },
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
  const baths = params.get('baths') || '';
  const hasBaths = all.some((p) => p.bathrooms != null);
  const sort = params.get('sort') || 'newest';
  const ccy = params.get('ccy') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const view = params.get('view') === 'map' ? 'map' : 'list';

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  function setParam(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    if (!('page' in patch)) next.delete('page');
    if (!('page' in patch) && !('sort' in patch) && !('ccy' in patch)) track('filter_used', { filter: Object.keys(patch).join(',') });
    router.push(`${basePath}?${next.toString()}`);
  }

  const visible = useMemo(() => {
    // Shared with the saved-search alerts: src/lib/listingSearch.ts.
    let list = filterListings(all, 'buy', params, { fxPerUsd: portalSettings()?.fxPerUsd, loc, marketFilters });
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

  const hasFilters = !!(search || type || beds || baths || stage || price || (market && market !== 'all') || marketFilters.some((f) => params.get(f.param)));
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
            Ready homes, commercial space and off-plan projects, with one team handling the
            purchase from first viewing to completion.
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
            <ViewToggle view={view} onChange={(v) => setParam({ view: v === 'map' ? 'map' : '' })} />
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
          {hasBaths && (
            <select aria-label="Bathrooms" value={baths} onChange={(e) => setParam({ baths: e.target.value })}>
              {BATHS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
            </select>
          )}
          <PriceRange value={price} onChange={(v) => setParam({ price: v })} />
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

        {/* The map shows every result, so the paged grid steps aside for it. */}
        {view === 'map' && !loading && !error && visible.length > 0 && (
          <ListingsMap listings={visible} displayCurrency={ccy || undefined} />
        )}
        <div className="pp-listpage-grid" hidden={view === 'map' && !loading && !error && visible.length > 0}>
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
              <NoResults filtered={hasFilters} clearHref={basePath} goal="Buy" country={loc?.country.name} city={loc?.city?.name} />
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
