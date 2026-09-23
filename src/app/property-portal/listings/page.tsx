'use client';
// @ts-nocheck

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PropertyCard } from '../_components/PropertyCard';
import { SaveSearchButton } from '../_components/SaveSearchButton';
import { MARKETS, matchesMarket, CURRENCIES, isRental, convertPrice } from '../_components/types';
import { useListings } from '../_components/useListings';


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

// Sale bands are USD equivalents, like the rent bands below — listings are
// priced in PKR, AED and GBP, so raw numbers aren't comparable.
const PRICES = [
  { v: '', l: 'Any price' },
  { v: '0-250000', l: 'Up to $250k' },
  { v: '250000-500000', l: '$250k – 500k' },
  { v: '500000-1000000', l: '$500k – 1M' },
  { v: '1000000-3000000', l: '$1M – 3M' },
  { v: '3000000-', l: '$3M +' },
];

/** Approximate USD purchase price. */
const usd = (p) => (p.price ? convertPrice(p.price, p.currency, 'USD') ?? p.price : null);

// Rent bands are per MONTH; annual rents are divided by 12 before comparing,
// so a UAE listing quoted per year sits alongside a London one quoted monthly.
const RENT_PRICES = [
  { v: '', l: 'Any rent' },
  { v: '0-1500', l: 'Up to $1.5k / mo' },
  { v: '1500-3000', l: '$1.5k – 3k / mo' },
  { v: '3000-6000', l: '$3k – 6k / mo' },
  { v: '6000-12000', l: '$6k – 12k / mo' },
  { v: '12000-', l: '$12k+ / mo' },
];

// Rents are listed in local currency (PKR, AED, GBP), so bands and sorting use
// the approximate USD equivalent — otherwise PKR 450,000 outranks GBP 3,200.
const monthlyRent = (p) => {
  const perMonth = (p.price ?? 0) / (p.rent_period === 'year' ? 12 : 1);
  return convertPrice(perMonth, p.currency, 'USD') ?? perMonth;
};

const LISTING_TYPES = [
  { v: '', l: 'All' },
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
    // Any filter/sort change resets to the first page.
    if (!('page' in patch)) next.delete('page');
    router.push(`/property-portal/listings?${next.toString()}`);
  }

  const visible = useMemo(() => {
    let list = all.filter((p) => matchesMarket(p, market));
    // Investments: purchasable listings that state a yield.
    if (params.get('with_yield')) list = list.filter((p) => p.yield_percentage != null && !isRental(p));
    if (type) list = list.filter((p) => p.property_type === type);
    // "For Rent" covers commercial leases too — both are tenancies.
    if (listingType) list = list.filter((p) => (rentView ? isRental(p) : p.listing_type === listingType));
    if (beds) list = list.filter((p) => (p.bedrooms ?? -1) >= Number(beds));
    if (price) {
      const [min, max] = price.split('-');
      if (rentView) {
        // Rent bands compare the monthly equivalent.
        if (min) list = list.filter((p) => monthlyRent(p) >= Number(min));
        if (max) list = list.filter((p) => monthlyRent(p) <= Number(max));
      } else {
        // Sale bands are capital prices; a monthly rent is not comparable.
        list = list.filter((p) => !isRental(p));
        if (min) list = list.filter((p) => (usd(p) ?? -1) >= Number(min));
        if (max) list = list.filter((p) => usd(p) != null && usd(p) <= Number(max));
      }
    }
    // Plot narrowing. Each one only ever removes rows, so a listing with no
    // plot data simply drops out rather than being treated as a match.
    if (plotSize) {
      const [min, max] = plotSize.split('-');
      list = list.filter((p) => {
        const sqft = plotSizeInSqFt(p.plot_size, p.plot_size_unit);
        if (sqft == null) return false;
        if (min && sqft < Number(min)) return false;
        if (max && sqft > Number(max)) return false;
        return true;
      });
    }
    if (plotCategory) list = list.filter((p) => p.plot_category === plotCategory);
    if (possession) list = list.filter((p) => p.possession_status === possession);
    for (const flag of PLOT_FLAGS) {
      if (params.get(flag.key) === '1') list = list.filter((p) => !!p[flag.column]);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(s) ||
          p.location?.toLowerCase().includes(s) ||
          p.city?.toLowerCase().includes(s) ||
          p.country?.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s) ||
          p.development_name?.toLowerCase().includes(s)
      );
    }
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

  const marketLabel = MARKETS.find((m) => m.key === market)?.label;
  const hasFilters = !!(search || type || beds || price || listingType || (market && market !== 'all') || params.get('with_yield'));

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / Listings
        </div>

        <div className="pp-listpage-head">
          <h1>
            Property <span className="pp-gold">Listings</span>
            {marketLabel && market !== 'all' ? ` — ${marketLabel}` : ''}
          </h1>
          <div className="pp-listpage-meta">
            <span>{loading ? 'Loading…' : error ? 'Unavailable' : `${visible.length} ${visible.length === 1 ? 'listing' : 'listings'}`}</span>
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
          {MARKETS.map((m) => (
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
          <select aria-label="Price range" value={price} onChange={(e) => setParam({ price: e.target.value })}>
            {(rentView ? RENT_PRICES : PRICES).map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
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

        <div className="pp-listpage-grid">
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
              <div className="pp-empty">
                No listings match these filters.{' '}
                <Link href="/property-portal/listings" className="pp-gold">Clear filters</Link>
              </div>
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
