'use client';
// @ts-nocheck

import { filterListings } from '@/lib/listingSearch';
import { portalSettings } from '../_components/portalRuntime';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PropertyCard } from '../_components/PropertyCard';
import { SaveSearchButton } from '../_components/SaveSearchButton';
import { portalMarketTabs, matchesMarket, CURRENCIES, isRental, convertPrice } from '../_components/types';
import { useListings } from '../_components/useListings';
import { PriceRange } from '../_components/PriceRange';
import { NoResults } from '../_components/ui';
import { ListingsMap, ViewToggle } from '../_components/ListingsMap';
import { track } from '../_components/analytics';


const PAGE_SIZE = 9;

import { plotSizeInSqFt, PLOT_CATEGORIES, POSSESSION_STATUSES } from '@/lib/plots';

// Plot size bands, compared in ft² because marla, kanal and ft² are mixed
// across markets — the same reason prices are compared in USD.
const PLOT_SIZES = [
  { v: '', l: 'Any plot size' },
  { v: '0-1125', l: 'Up to 5 Marla' },
  { v: '1125-2250', l: '5 – 10 Marla' },
  { v: '2250-4500', l: '10 Marla – 1 Kanal' },
  { v: '4500-9000', l: '1 – 2 Kanal' },
  { v: '9000-', l: '2 Kanal +' },
];

const PLOT_FLAGS = [
  { key: 'corner', column: 'corner_plot', label: 'Corner' },
  { key: 'main_road', column: 'main_road', label: 'Main road' },
  { key: 'canal_facing', column: 'canal_facing', label: 'Canal facing' },
  { key: 'approved', column: 'approved', label: 'Approved' },
];

const TYPES = [
  { v: '', l: 'Any type' },
  { v: 'residential', l: 'Residential' },
  { v: 'commercial', l: 'Commercial' },
  { v: 'industrial', l: 'Industrial' },
  { v: 'mixed_use', l: 'Mixed Use' },
  { v: 'land', l: 'Plot / Land' },
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

/** Approximate USD purchase price. */
const usd = (p) => (p.price ? convertPrice(p.price, p.currency, 'USD') ?? p.price : null);

// Rents are listed in local currency (PKR, AED, GBP), so bands and sorting use
// the approximate USD equivalent — otherwise PKR 450,000 outranks GBP 3,200.
const monthlyRent = (p) => {
  const perMonth = (p.price ?? 0) / (p.rent_period === 'year' ? 12 : 1);
  return convertPrice(perMonth, p.currency, 'USD') ?? perMonth;
};

const LISTING_TYPES = [
  { v: '', l: 'Buy or rent' },
  { v: 'sale', l: 'For Sale' },
  { v: 'rent', l: 'For Rent' },
  { v: 'off_plan', l: 'Off-Plan' },
];

const SORTS = [
  { v: 'newest', l: 'Newest' },
  { v: 'price-asc', l: 'Price: low to high' },
  { v: 'price-desc', l: 'Price: high to low' },
  { v: 'yield-desc', l: 'Yield: high to low' },
];

function ListingsInner() {
  const router = useRouter();
  const params = useSearchParams();

  const { all, loading, error, reload } = useListings();

  const market = params.get('market') || 'all';
  const search = params.get('search') || '';
  const type = params.get('type') || '';
  const beds = params.get('beds') || '';
  const price = params.get('price') || '';
  const listingType = params.get('listing_type') || '';
  const rentView = listingType === 'rent' || listingType === 'lease';
  // Plot filters — only meaningful once the type filter is on land.
  const plotSize = params.get('plot_size') || '';
  const plotCategory = params.get('plot_category') || '';
  const possession = params.get('possession') || '';
  const plotView = type === 'land';
  const sort = params.get('sort') || 'newest';
  const baths = params.get('baths') || '';
  const hasBaths = all.some((p) => p.bathrooms != null);
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
    // Any filter/sort change resets to the first page.
    if (!('page' in patch)) next.delete('page');
    if (!('page' in patch) && !('sort' in patch) && !('ccy' in patch)) track('filter_used', { filter: Object.keys(patch).join(',') });
    router.push(`/property-portal/listings?${next.toString()}`);
  }

  const visible = useMemo(() => {
    // Shared with the saved-search alerts: src/lib/listingSearch.ts.
    let list = filterListings(all, 'listings', params, { fxPerUsd: portalSettings()?.fxPerUsd });
    const sorted = [...list];
    // Rents and purchase prices can't share one scale: sort each on its own
    // (rent by monthly equivalent) and keep sales ahead of rentals.
    const key = (p) => (isRental(p) ? monthlyRent(p) : usd(p));
    const byPrice = (dir) => (a, b) => {
      const ra = isRental(a), rb = isRental(b);
      if (ra !== rb) return ra ? 1 : -1;
      const va = key(a), vb = key(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      return dir * (va - vb);
    };
    if (sort === 'price-asc') sorted.sort(byPrice(1));
    if (sort === 'price-desc') sorted.sort(byPrice(-1));
    if (sort === 'yield-desc') sorted.sort((a, b) => (b.yield_percentage ?? -1) - (a.yield_percentage ?? -1));
    return sorted;
  }, [all, market, type, beds, price, listingType, search, sort, rentView, plotSize, plotCategory, possession, params]);

  const markets = portalMarketTabs();
  const marketLabel = markets.find((m) => m.key === market)?.label;
  const hasFilters = !!(search || type || beds || baths || price || listingType || (market && market !== 'all') || params.get('with_yield'));

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / All properties
        </div>

        <div className="pp-listpage-head">
          <h1>
            All <span className="pp-gold">Properties</span>
            {marketLabel && market !== 'all' ? ` — ${marketLabel}` : ''}
          </h1>
          <div className="pp-listpage-meta">
            <span>{loading ? 'Loading…' : error ? 'Unavailable' : `${visible.length} ${visible.length === 1 ? 'listing' : 'listings'}`}</span>
            <ViewToggle view={view} onChange={(v) => setParam({ view: v === 'map' ? 'map' : '' })} />
            <SaveSearchButton />
            <label>
              Sort:{' '}
              <select value={sort} onChange={(e) => setParam({ sort: e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s.v} value={s.v}>{s.l}</option>
                ))}
              </select>
            </label>
            <label>
              Currency:{' '}
              <select value={ccy} onChange={(e) => setParam({ ccy: e.target.value })}>
                <option value="">As listed</option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="pp-market-tabs">
          {markets.map((m) => (
            <button
              key={m.key}
              className={market === m.key ? 'active' : ''}
              onClick={() => setParam({ market: m.key === 'all' ? '' : m.key })}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form
          className="pp-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ search: searchInput.trim() });
          }}
        >
          <input
            type="text"
            placeholder="Search city, area or project…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select aria-label="Property type" value={type} onChange={(e) => setParam({ type: e.target.value })}>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <select aria-label="Bedrooms" value={beds} onChange={(e) => setParam({ beds: e.target.value })} disabled={plotView} title={plotView ? 'Plots have no bedrooms' : undefined}>
            {BEDS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
          </select>
          {hasBaths && (
            <select aria-label="Bathrooms" value={baths} onChange={(e) => setParam({ baths: e.target.value })}>
              {BATHS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
            </select>
          )}
          <PriceRange value={price} onChange={(v) => setParam({ price: v })} rent={rentView} />
          <select aria-label="Listing type" value={listingType} onChange={(e) => setParam({ listing_type: e.target.value, price: '' })}>
            {LISTING_TYPES.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
          </select>
          <button type="submit">Search</button>
          {hasFilters && (
            <button
              type="button"
              className="pp-filters-reset"
              onClick={() => router.push('/property-portal/listings')}
            >
              Reset
            </button>
          )}

          {plotView && (
            <div className="pp-plot-filters">
              <select aria-label="Plot size" value={plotSize} onChange={(e) => setParam({ plot_size: e.target.value })}>
                {PLOT_SIZES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
              <select aria-label="Plot category" value={plotCategory} onChange={(e) => setParam({ plot_category: e.target.value })}>
                <option value="">Any category</option>
                {PLOT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select aria-label="Possession status" value={possession} onChange={(e) => setParam({ possession: e.target.value })}>
                <option value="">Any possession status</option>
                {POSSESSION_STATUSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              {PLOT_FLAGS.map((flag) => (
                <label key={flag.key} className="pp-plot-flag">
                  <input
                    type="checkbox"
                    checked={params.get(flag.key) === '1'}
                    onChange={(e) => setParam({ [flag.key]: e.target.checked ? '1' : '' })}
                  />
                  {flag.label}
                </label>
              ))}
            </div>
          )}
        </form>

        {/* The map shows every result, so the paged grid steps aside for it. */}
        {view === 'map' && !loading && !error && visible.length > 0 && (
          <ListingsMap listings={visible} displayCurrency={ccy || undefined} />
        )}
        <div className="pp-listpage-grid" hidden={view === 'map' && !loading && !error && visible.length > 0}>
          <div className="pp-grid">
            {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="pp-skeleton" />)}
            {!loading && error && (
              <div className="pp-empty">
                We couldn&apos;t load the listings just now.{' '}
                <button type="button" className="pp-retry" onClick={reload}>Try again</button>
                <span className="pp-empty-detail">{error}</span>
              </div>
            )}
            {!loading && !error && visible.length === 0 && (
              <NoResults filtered={hasFilters} clearHref="/property-portal/listings" goal={rentView ? 'Rent' : 'Buy'} />
            )}
            {!loading && !error && paged.map((prop) => (
              <PropertyCard key={prop.id} prop={prop} displayCurrency={ccy || undefined} />
            ))}
          </div>

          {!loading && !error && totalPages > 1 && (
            <div className="pp-pager">
              <button
                disabled={currentPage <= 1}
                onClick={() => setParam({ page: String(currentPage - 1) })}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={currentPage === i + 1 ? 'active' : ''}
                  onClick={() => setParam({ page: String(i + 1) })}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setParam({ page: String(currentPage + 1) })}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<main><div className="pp-container"><div className="pp-listpage-grid"><div className="pp-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="pp-skeleton" />)}</div></div></div></main>}>
      <ListingsInner />
    </Suspense>
  );
}
