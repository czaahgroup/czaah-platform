'use client';
// @ts-nocheck

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PropertyCard } from '../_components/PropertyCard';
import { SaveSearchButton } from '../_components/SaveSearchButton';
import { MARKETS, matchesMarket, CURRENCIES, convertPrice } from '../_components/types';
import { useListings } from '../_components/useListings';
import { DevelopmentStrip } from '../_components/DevelopmentStrip';


const PAGE_SIZE = 9;

const TYPES = [
  { v: '', l: 'Any type' },
  { v: 'residential', l: 'Residential' },
  { v: 'commercial', l: 'Commercial' },
  { v: 'mixed_use', l: 'Mixed Use' },
  { v: 'land', l: 'Land' },
];

// USD equivalents — projects are priced in PKR, AED and GBP.
const PRICES = [
  { v: '', l: 'Any price' },
  { v: '0-250000', l: 'Up to $250k' },
  { v: '250000-500000', l: '$250k – 500k' },
  { v: '500000-1000000', l: '$500k – 1M' },
  { v: '1000000-3000000', l: '$1M – 3M' },
  { v: '3000000-', l: '$3M +' },
];

const usd = (p) => (p.price ? convertPrice(p.price, p.currency, 'USD') ?? p.price : null);

const SORTS = [
  { v: 'newest', l: 'Newest' },
  { v: 'price-asc', l: 'Price: low to high' },
  { v: 'price-desc', l: 'Price: high to low' },
  { v: 'yield-desc', l: 'Yield: high to low' },
];

function OffPlanInner() {
  const router = useRouter();
  const params = useSearchParams();

  const { all, loading, error, reload } = useListings();

  const market = params.get('market') || 'all';
  const search = params.get('search') || '';
  const type = params.get('type') || '';
  const price = params.get('price') || '';
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
    router.push(`/property-portal/off-plan?${next.toString()}`);
  }

  const visible = useMemo(() => {
    let list = all.filter((p) => p.listing_type === 'off_plan');
    list = list.filter((p) => matchesMarket(p, market));
    if (type) list = list.filter((p) => p.property_type === type);
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
    if (sort === 'price-asc') sorted.sort((a, b) => (usd(a) ?? Infinity) - (usd(b) ?? Infinity));
    if (sort === 'price-desc') sorted.sort((a, b) => (usd(b) ?? -1) - (usd(a) ?? -1));
    if (sort === 'yield-desc') sorted.sort((a, b) => (b.yield_percentage ?? -1) - (a.yield_percentage ?? -1));
    return sorted;
  }, [all, market, type, price, search, sort]);

  const hasFilters = !!(search || type || price || (market && market !== 'all'));
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main>
      {/* Intro */}
      <section className="pp-hero pp-hero--compact">
        <div className="pp-container">
          <div className="pp-eyebrow">CZAAH Properties</div>
          <h1>Off-plan <span className="pp-gold">projects.</span></h1>
          <p className="pp-hero-lede">
            Early-stage opportunities across London, Dubai and Pakistan — priced ahead of
            completion, with structured payment plans and CZAAH handling due diligence and the
            developer relationship on your behalf.
          </p>
        </div>
      </section>

      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / Off-Plan
        </div>
      </div>

      <DevelopmentStrip />

      <div className="pp-container">

        <div className="pp-listpage-head" style={{ paddingTop: 18 }}>
          <div className="pp-listpage-meta">
            <span>{loading ? 'Loading…' : error ? 'Unavailable' : `${visible.length} ${visible.length === 1 ? 'project' : 'projects'}`}</span>
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
            placeholder="Search project, city or area…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select aria-label="Property type" value={type} onChange={(e) => setParam({ type: e.target.value })}>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <select aria-label="Price range" value={price} onChange={(e) => setParam({ price: e.target.value })}>
            {PRICES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button type="submit">Search</button>
          {hasFilters && (
            <button
              type="button"
              className="pp-filters-reset"
              onClick={() => router.push('/property-portal/off-plan')}
            >
              Reset
            </button>
          )}
        </form>

        <div className="pp-listpage-grid">
          <div className="pp-grid">
            {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="pp-skeleton" />)}
            {!loading && error && (
              <div className="pp-empty">
                We couldn&apos;t load the projects just now.{' '}
                <button type="button" className="pp-retry" onClick={reload}>Try again</button>
                <span className="pp-empty-detail">{error}</span>
              </div>
            )}
            {!loading && !error && visible.length === 0 && (
              <div className="pp-empty">
                No off-plan projects match these filters.{' '}
                <Link href="/property-portal/off-plan" className="pp-gold">Clear filters</Link>
              </div>
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

export default function OffPlanPage() {
  return (
    <Suspense fallback={<main><div className="pp-container"><div className="pp-listpage-grid"><div className="pp-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="pp-skeleton" />)}</div></div></div></main>}>
      <OffPlanInner />
    </Suspense>
  );
}
