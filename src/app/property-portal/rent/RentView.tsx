'use client';
// @ts-nocheck

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PropertyCard } from '../_components/PropertyCard';
import { matchesMarket, CURRENCIES, isRental, convertPrice } from '../_components/types';
import { portalLocations } from '../_components/portalRuntime';
import { resolveLocation, inLocation, locationLabel, locationHref } from '../_components/locationNav';
import { LocationChips } from '../_components/LocationChips';
import { LocationSearch, suggestionHref } from '../_components/LocationSearch';
import { useListings } from '../_components/useListings';


const PAGE_SIZE = 9;

const TYPES = [
  { v: '', l: 'Any type' },
  { v: 'residential', l: 'Residential' },
  { v: 'commercial', l: 'Commercial' },
  { v: 'industrial', l: 'Industrial' },
  { v: 'mixed_use', l: 'Mixed Use' },
];

const BEDS = [
  { v: '', l: 'Any beds' },
  { v: '0', l: 'Studio' },
  { v: '1', l: '1+' },
  { v: '2', l: '2+' },
  { v: '3', l: '3+' },
  { v: '4', l: '4+' },
];

// Bands are per MONTH in USD; annual rents (the UAE convention) are divided by
// 12 and every rent converted, so all three markets share one filter.
const RENTS = [
  { v: '', l: 'Any rent' },
  { v: '0-1500', l: 'Up to $1.5k / mo' },
  { v: '1500-3000', l: '$1.5k – 3k / mo' },
  { v: '3000-6000', l: '$3k – 6k / mo' },
  { v: '6000-12000', l: '$6k – 12k / mo' },
  { v: '12000-', l: '$12k+ / mo' },
];

const FURNISHING = [
  { v: '', l: 'Any furnishing' },
  { v: 'furnished', l: 'Furnished' },
  { v: 'part_furnished', l: 'Part furnished' },
  { v: 'unfurnished', l: 'Unfurnished' },
];

const SORTS = [
  { v: 'newest', l: 'Newest' },
  { v: 'rent-asc', l: 'Rent: low to high' },
  { v: 'rent-desc', l: 'Rent: high to low' },
  { v: 'available', l: 'Available soonest' },
];

// Rents are listed in local currency (PKR, AED, GBP), so bands and sorting use
// the approximate USD equivalent — otherwise PKR 450,000 outranks GBP 3,200.
const monthlyRent = (p) => {
  const perMonth = (p.price ?? 0) / (p.rent_period === 'year' ? 12 : 1);
  return convertPrice(perMonth, p.currency, 'USD') ?? perMonth;
};

function RentInner({ countrySlug, citySlug }: { countrySlug?: string; citySlug?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  // /rent/<country>/<city> — resolved against Admin → Locations.
  const loc = resolveLocation(portalLocations(), countrySlug, citySlug);
  const basePath = locationHref('rent', loc?.country, loc?.city);

  const { all, loading, error, reload } = useListings();

  const market = params.get('market') || 'all';
  const search = params.get('search') || '';
  const type = params.get('type') || '';
  const beds = params.get('beds') || '';
  const price = params.get('price') || '';
  const furnishing = params.get('furnishing') || '';
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
    // Rent and lease are both tenancies — residential lets and commercial leases.
    let list = all.filter(isRental);
    list = list.filter((p) => matchesMarket(p, market));
    list = list.filter((p) => inLocation(p, loc));
    if (type) list = list.filter((p) => p.property_type === type);
    if (beds) list = list.filter((p) => (p.bedrooms ?? -1) >= Number(beds));
    if (furnishing) list = list.filter((p) => p.furnishing === furnishing);
    if (price) {
      const [min, max] = price.split('-');
      if (min) list = list.filter((p) => monthlyRent(p) >= Number(min));
      if (max) list = list.filter((p) => monthlyRent(p) <= Number(max));
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
    // "Price on request" rentals sink to the bottom either way.
    const byRent = (dir) => (a, b) => {
      if (!a.price) return 1;
      if (!b.price) return -1;
      return dir * (monthlyRent(a) - monthlyRent(b));
    };
    if (sort === 'rent-asc') sorted.sort(byRent(1));
    if (sort === 'rent-desc') sorted.sort(byRent(-1));
    if (sort === 'available') {
      // No date = ask; treat as after anything with a date.
      const t = (p) => (p.available_from ? new Date(p.available_from).getTime() : Infinity);
      sorted.sort((a, b) => t(a) - t(b));
    }
    return sorted;
  }, [all, market, loc, type, beds, furnishing, price, search, sort]);

  const hasFilters = !!(search || type || beds || furnishing || price || (market && market !== 'all'));
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
            {loc ? <>Property to rent in <span className="pp-gold">{locationLabel(loc)}</span></> : <>Homes &amp; spaces <span className="pp-gold">to rent.</span></>}
          </h1>
          <p className="pp-hero-lede">
            Residential lets and commercial leases across the United Kingdom, Dubai and
            Pakistan, with the terms stated up front: rent, deposit, minimum term and when you
            can move in.
          </p>
        </div>
      </section>

      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> /{' '}
          {loc ? <Link href={locationHref('rent')}>Rent</Link> : 'Rent'}
          {loc && (loc.city ? (
            <> / <Link href={locationHref('rent', loc.country)}>{loc.country.name}</Link> / {loc.city.name}</>
          ) : (
            <> / {loc.country.name}</>
          ))}
        </div>

        <div className="pp-listpage-head" style={{ paddingTop: 18 }}>
          <div className="pp-listpage-meta">
            <span>{loading ? 'Loading…' : error ? 'Unavailable' : `${visible.length} ${visible.length === 1 ? 'rental' : 'rentals'}`}</span>
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

        <LocationChips section="rent" loc={loc} />

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
            label="Search location, area or building"
            placeholder="Search city, area or building…"
            onPick={(s) => {
              const carry = new URLSearchParams(params.toString());
              carry.delete('page');
              router.push(suggestionHref('rent', s, '', carry));
            }}
            onSubmitText={(text) => setParam({ search: text.trim() })}
          />
          <select value={type} onChange={(e) => setParam({ type: e.target.value })}>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <select value={beds} onChange={(e) => setParam({ beds: e.target.value })}>
            {BEDS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
          </select>
          <select value={price} onChange={(e) => setParam({ price: e.target.value })}>
            {RENTS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <select value={furnishing} onChange={(e) => setParam({ furnishing: e.target.value })}>
            {FURNISHING.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
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

        <div className="pp-listpage-grid">
          <div className="pp-grid">
            {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="pp-skeleton" />)}
            {!loading && error && (
              <div className="pp-empty">
                We couldn&apos;t load the rentals just now.{' '}
                <button type="button" className="pp-retry" onClick={reload}>Try again</button>
                <span className="pp-empty-detail">{error}</span>
              </div>
            )}
            {!loading && !error && visible.length === 0 && (
              hasFilters ? (
                <div className="pp-empty">
                  No rentals match these filters.{' '}
                  <Link href={basePath} className="pp-gold">Clear filters</Link>
                </div>
              ) : (
                <div className="pp-empty">
                  New rentals are being added. Tell us what you&apos;re looking for and we&apos;ll
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

export function RentView({ countrySlug, citySlug }: { countrySlug?: string; citySlug?: string } = {}) {
  return (
    <Suspense fallback={<main><div className="pp-container"><div className="pp-listpage-grid"><div className="pp-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="pp-skeleton" />)}</div></div></div></main>}>
      <RentInner countrySlug={countrySlug} citySlug={citySlug} />
    </Suspense>
  );
}
