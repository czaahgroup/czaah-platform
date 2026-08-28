'use client';
// @ts-nocheck

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PropertyCard } from '../_components/PropertyCard';
import { LiveProperty, MARKETS, matchesMarket, CURRENCIES } from '../_components/types';

export const runtime = 'edge';

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

const PRICES = [
  { v: '', l: 'Any price' },
  { v: '0-250000', l: 'Up to 250k' },
  { v: '250000-500000', l: '250k – 500k' },
  { v: '500000-1000000', l: '500k – 1M' },
  { v: '1000000-3000000', l: '1M – 3M' },
  { v: '3000000-', l: '3M +' },
];

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

  const [all, setAll] = useState<LiveProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const market = params.get('market') || 'all';
  const search = params.get('search') || '';
  const type = params.get('type') || '';
  const beds = params.get('beds') || '';
  const price = params.get('price') || '';
  const listingType = params.get('listing_type') || '';
  const sort = params.get('sort') || 'newest';
  const ccy = params.get('ccy') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          '/api/public/properties?countries=' +
            encodeURIComponent('Pakistan,United Kingdom,United Arab Emirates')
        );
        const json = await res.json();
        if (res.ok) setAll(json.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
    if (type) list = list.filter((p) => p.property_type === type);
    if (listingType) list = list.filter((p) => p.listing_type === listingType);
    if (beds) list = list.filter((p) => (p.bedrooms ?? -1) >= Number(beds));
    if (price) {
      const [min, max] = price.split('-');
      if (min) list = list.filter((p) => (p.price ?? 0) >= Number(min));
      if (max) list = list.filter((p) => (p.price ?? 0) <= Number(max));
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
    if (sort === 'price-asc') sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort === 'price-desc') sorted.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    if (sort === 'yield-desc') sorted.sort((a, b) => (b.yield_percentage ?? -1) - (a.yield_percentage ?? -1));
    return sorted;
  }, [all, market, type, beds, price, listingType, search, sort]);

  const marketLabel = MARKETS.find((m) => m.key === market)?.label;
  const hasFilters = !!(search || type || beds || price || listingType || (market && market !== 'all'));

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
            <span>{loading ? 'Loading…' : `${visible.length} ${visible.length === 1 ? 'listing' : 'listings'}`}</span>
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
          <select value={type} onChange={(e) => setParam({ type: e.target.value })}>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <select value={beds} onChange={(e) => setParam({ beds: e.target.value })}>
            {BEDS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
          </select>
          <select value={price} onChange={(e) => setParam({ price: e.target.value })}>
            {PRICES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <select value={listingType} onChange={(e) => setParam({ listing_type: e.target.value })}>
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
        </form>

        <div className="pp-listpage-grid">
          <div className="pp-grid">
            {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="pp-skeleton" />)}
            {!loading && visible.length === 0 && (
              <div className="pp-empty">
                No listings match these filters.{' '}
                <Link href="/property-portal/listings" className="pp-gold">Clear filters</Link>
              </div>
            )}
            {!loading && paged.map((prop) => (
              <PropertyCard key={prop.id} prop={prop} displayCurrency={ccy || undefined} />
            ))}
          </div>

          {!loading && totalPages > 1 && (
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
