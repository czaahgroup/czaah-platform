'use client';
// @ts-nocheck

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';
import { createClient } from '@/lib/supabase/client';

interface LocationOption {
  label: string;
  type: 'city' | 'area';
  city?: string;
  country?: string | null;
}

interface LiveProperty {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  price: number | null;
  currency: string;
  location: string;
  city: string;
  country: string | null;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  description: string | null;
  features: string[];
  images: string[];
  yield_percentage: number | null;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  sale: { label: 'For Sale', className: 'status-for-sale' },
  rent: { label: 'For Rent', className: 'status-for-rent' },
  lease: { label: 'For Rent', className: 'status-for-rent' },
  off_plan: { label: 'Off Plan', className: 'status-off-plan' },
};

export default function RealEstatePage() {
  const router = useRouter();
  const supabase = createClient();
  const [properties, setProperties] = useState<LiveProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterListingType, setFilterListingType] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch('/api/public/properties/locations');
        const json = await res.json();
        if (!res.ok) return;
        const cities: LocationOption[] = (json.cities || []).map((c: { label: string; country: string | null }) => ({
          label: c.label, type: 'city' as const, country: c.country,
        }));
        const areas: LocationOption[] = (json.areas || []).map((a: { label: string; city: string }) => ({
          label: a.label, type: 'area' as const, city: a.city,
        }));
        setLocationOptions([...cities, ...areas]);
      } catch (err) {
        console.error('Failed to load location suggestions:', err);
      }
    }
    fetchLocations();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowLocationSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const locationSuggestions = searchQuery.trim().length > 0
    ? locationOptions
        .filter((opt) => opt.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  function selectLocationSuggestion(opt: LocationOption) {
    setSearchQuery(opt.label);
    setShowLocationSuggestions(false);
    setHighlightedIndex(-1);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showLocationSuggestions || locationSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % locationSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? locationSuggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      selectLocationSuggestion(locationSuggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowLocationSuggestions(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filterCity) params.set('city', filterCity);
        if (filterType) params.set('type', filterType);
        if (filterListingType) params.set('listing_type', filterListingType);
        if (filterMinPrice) params.set('min_price', filterMinPrice);
        if (filterMaxPrice) params.set('max_price', filterMaxPrice);
        const res = await fetch(`/api/public/properties?${params.toString()}`);
        const json = await res.json();
        if (res.ok) setProperties(json.data || []);
      } catch (err) {
        console.error('Failed to load properties:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, filterCity, filterType, filterListingType, filterMinPrice, filterMaxPrice]);

  function clearFilters() {
    setSearchQuery('');
    setFilterCity('');
    setFilterType('');
    setFilterListingType('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setShowLocationSuggestions(false);
    setHighlightedIndex(-1);
  }

  async function handleEnquire(propertyId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/register');
      return;
    }
    try {
      const res = await fetch('/api/property-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const json = await res.json();
      if (res.ok && json.data?.id) {
        router.push(`/dashboard/property-chats?id=${json.data.id}`);
      } else {
        alert(json.error || 'Failed to start enquiry. Please try again.');
      }
    } catch {
      alert('Failed to start enquiry. Please try again.');
    }
  }

  useEffect(() => {
    // Intersection Observer for fade-in sections
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />
      <style dangerouslySetInnerHTML={{ __html: `
    .properties-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 48px;
    }

    .property-card {
      background: var(--black-card);
      border: 1px solid var(--black-border);
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.5s var(--ease-smooth);
      display: flex;
      flex-direction: column;
    }

    .property-card:hover {
      border-color: rgba(201, 168, 76, 0.2);
      transform: translateY(-4px);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(201, 168, 76, 0.08);
    }

    .property-img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      background: rgba(255,255,255,0.03);
    }

    .property-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .property-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    .property-type {
      padding: 3px 10px;
      border: 1px solid rgba(201, 168, 76, 0.3);
      color: var(--gold);
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 4px;
      font-weight: 500;
    }

    .property-location {
      padding: 3px 10px;
      border: 1px solid var(--black-border);
      color: var(--white-muted);
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border-radius: 4px;
      font-weight: 500;
    }

    .property-body h3 {
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 8px;
      letter-spacing: -0.01em;
      line-height: 1.35;
    }

    .property-body p {
      font-size: 13px;
      line-height: 1.65;
      color: var(--white-muted);
      margin-bottom: 18px;
      flex-grow: 1;
    }

    .property-stats {
      display: flex;
      gap: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--black-border);
      margin-bottom: 18px;
    }

    .property-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .property-stat-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--gold);
    }

    .property-stat-label {
      font-size: 10px;
      color: var(--white-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .property-cta {
      font-size: 13px;
      font-weight: 500;
      color: var(--gold);
      text-decoration: none;
      transition: all 0.3s var(--ease-out);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .property-cta:hover {
      gap: 10px;
      color: var(--gold-light);
    }

    .property-status {
      position: absolute;
      top: 16px;
      left: 16px;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .status-available {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .status-limited {
      background: rgba(234, 179, 8, 0.15);
      color: #eab308;
      border: 1px solid rgba(234, 179, 8, 0.3);
    }

    .status-coming {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .status-for-sale {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .status-off-plan {
      background: rgba(168, 85, 247, 0.15);
      color: #a855f7;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .status-for-rent {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .property-img-wrapper {
      position: relative;
    }

    @media (max-width: 1024px) {
      .properties-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 640px) {
      .properties-grid { grid-template-columns: 1fr; }
      .search-filters { flex-direction: column; }
      .search-bar { min-width: 100%; }
    }

    /* Search & Filters */
    .search-panel {
      margin-top: 36px;
      margin-bottom: 12px;
    }

    .search-bar-row {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      position: relative;
    }

    .location-suggestions {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      background: #0F0F0F;
      border: 1px solid var(--black-border);
      border-radius: 10px;
      overflow: hidden;
      z-index: 20;
      box-shadow: 0 16px 40px rgba(0,0,0,0.5);
    }

    .location-suggestion {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 18px;
      cursor: pointer;
      font-family: 'Raleway', sans-serif;
      font-size: 13px;
      color: var(--white);
      transition: background 0.15s ease;
    }

    .location-suggestion:not(:last-child) {
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }

    .location-suggestion:hover,
    .location-suggestion.highlighted {
      background: rgba(201,168,76,0.1);
    }

    .location-suggestion-label {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .location-suggestion-icon {
      font-size: 16px;
      color: var(--gold-dim);
    }

    .location-suggestion-meta {
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--white-dim);
    }

    .search-bar {
      flex: 1;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--black-border);
      border-radius: 10px;
      padding: 14px 18px 14px 44px;
      color: var(--white);
      font-family: 'Raleway', sans-serif;
      font-size: 14px;
      outline: none;
      transition: border-color 0.3s ease;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.25)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: 16px center;
    }

    .search-bar:focus {
      border-color: var(--gold);
    }

    .search-bar::placeholder {
      color: rgba(255,255,255,0.25);
    }

    .search-filters {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-select {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--black-border);
      border-radius: 8px;
      padding: 10px 36px 10px 14px;
      color: var(--white);
      font-family: 'Raleway', sans-serif;
      font-size: 12px;
      letter-spacing: 0.03em;
      outline: none;
      cursor: pointer;
      transition: border-color 0.3s ease;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(201,168,76,0.6)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
    }

    .filter-select:focus {
      border-color: var(--gold);
    }

    .filter-select option {
      background: #0F0F0F;
      color: var(--white);
    }

    .search-results-count {
      font-size: 12px;
      color: var(--white-muted);
      margin-top: 8px;
    }

    .search-results-count span {
      color: var(--gold);
      font-weight: 600;
    }

    .property-card.hidden {
      display: none;
    }

    .no-results {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: var(--white-muted);
    }

    .no-results h3 {
      color: var(--gold);
      margin-bottom: 8px;
      font-size: 18px;
    }

    .clear-filters {
      background: none;
      border: 1px solid var(--black-border);
      border-radius: 8px;
      padding: 10px 18px;
      color: var(--white-muted);
      font-family: 'Raleway', sans-serif;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .clear-filters:hover {
      border-color: var(--gold);
      color: var(--gold);
    }
  ` }} />
      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{backgroundImage: "url('/Images/Real-Estate.jpg')"}}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Investment Advisory & Facilitation</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Real<br /><span className="text-primary">Estate.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">CZAAH facilitates real estate investment across international markets — Pakistan, the United Kingdom, the UAE, and Europe. In Pakistan alone, the market is valued at over $300 billion, with CPEC creating entirely new growth corridors. We provide structured, transparent access for international and diaspora investors seeking the highest-growth property opportunities worldwide.</p>
            <a href="/contact?interest=Real%20Estate#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Investment Enquiries &rarr;</a>
          </section>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  INTERNATIONAL MARKETS  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">International <span className="text-primary">markets.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">Beyond Pakistan, CZAAH facilitates property investment across leading global real estate markets — structured access, local partnerships, and end-to-end transaction support.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">location_city</span>
                <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-3">United Kingdom</h4>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Residential and commercial property across London and major UK cities — a stable, transparent market with strong legal protections, popular with diaspora and institutional investors alike.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">apartment</span>
                <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Dubai</h4>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Freehold property in Dubai's designated investment zones — tax-free returns, high rental yields, and one of the world's most investor-friendly ownership frameworks.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">mosque</span>
                <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Saudi Arabia</h4>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Residential and commercial property across Riyadh and the Kingdom's Vision 2030 giga-projects — expanding foreign ownership reforms opening a market long closed to international investors.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">domain</span>
                <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Qatar</h4>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Freehold property in Doha's designated investment zones — strong rental demand, tax-free returns, and residency-linked ownership for qualifying investments.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">euro</span>
                <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Europe</h4>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Residency-linked property investment across Portugal, Greece, Spain, and Cyprus — structured through CZAAH's investment migration advisory for investors seeking EU market access alongside real estate returns.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  FEATURED PROPERTIES  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Your Expert Property Finder in London</div>
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Featured <span className="text-primary">properties.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-2">Hand-selected investment opportunities across our international real estate markets. Each listing is pre-vetted, title-verified, and investment-ready.</p>

            <div className="search-panel">
              <div className="search-bar-row" ref={searchWrapRef}>
                <input
                  type="text"
                  className="search-bar"
                  placeholder="Search by location — e.g. London, Dubai, Canary Wharf..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowLocationSuggestions(true); setHighlightedIndex(-1); }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  onKeyDown={handleSearchKeyDown}
                  autoComplete="off"
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="location-suggestions">
                    {locationSuggestions.map((opt, i) => (
                      <div
                        key={`${opt.type}-${opt.label}`}
                        className={`location-suggestion${i === highlightedIndex ? ' highlighted' : ''}`}
                        onMouseDown={() => selectLocationSuggestion(opt)}
                        onMouseEnter={() => setHighlightedIndex(i)}
                      >
                        <span className="location-suggestion-label">
                          <span className="material-symbols-outlined location-suggestion-icon">
                            {opt.type === 'city' ? 'location_city' : 'place'}
                          </span>
                          {opt.label}
                        </span>
                        <span className="location-suggestion-meta">
                          {opt.type === 'city' ? (opt.country || 'City') : opt.city}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="search-filters">
                <select className="filter-select" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
                  <option value="">All Locations</option>
                  <option value="London">London</option>
                  <option value="Islamabad">Islamabad</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Gwadar">Gwadar</option>
                  <option value="Dubai">Dubai</option>
                  <option value="Riyadh">Riyadh</option>
                  <option value="Doha">Doha</option>
                </select>
                <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="">All Types</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="land">Land</option>
                  <option value="mixed_use">Mixed Use</option>
                </select>
                <select className="filter-select" value={filterListingType} onChange={(e) => setFilterListingType(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="sale">For Sale</option>
                  <option value="rent">For Rent</option>
                  <option value="off_plan">Off Plan</option>
                </select>
                <input
                  type="number"
                  placeholder="Min Price"
                  value={filterMinPrice}
                  onChange={(e) => setFilterMinPrice(e.target.value)}
                  className="filter-select"
                  style={{ width: '130px' }}
                />
                <input
                  type="number"
                  placeholder="Max Price"
                  value={filterMaxPrice}
                  onChange={(e) => setFilterMaxPrice(e.target.value)}
                  className="filter-select"
                  style={{ width: '130px' }}
                />
                <button className="clear-filters" onClick={clearFilters}>Clear All</button>
              </div>
              <div className="search-results-count">
                <span>{properties.length}</span> propert{properties.length === 1 ? 'y' : 'ies'} found
              </div>
            </div>

            <div className="properties-grid">
              {loading ? (
                <div className="no-results"><h3>Loading properties&hellip;</h3></div>
              ) : properties.length === 0 ? (
                <div className="no-results"><h3>No properties match your criteria</h3><p>Try adjusting your filters or search terms.</p></div>
              ) : properties.map((prop) => {
                const statusMeta = STATUS_META[prop.listing_type] || { label: prop.listing_type, className: 'status-available' };
                const image = prop.images && prop.images.length > 0 ? prop.images[0] : null;
                const imageSrc = image
                  ? (image.startsWith('http') || image.startsWith('/'))
                    ? image
                    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/platform-files/${image}`
                  : null;
                return (
                  <div key={prop.id} className="property-card">
                    <div className="property-img-wrapper">
                      {imageSrc ? (
                        <img className="property-img" src={imageSrc} alt={prop.title} />
                      ) : (
                        <div className="property-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '32px' }}>&#8962;</div>
                      )}
                      <span className={`property-status ${statusMeta.className}`}>{statusMeta.label}</span>
                    </div>
                    <div className="property-body">
                      <div className="property-tags">
                        <span className="property-type">{prop.property_type.replace('_', ' ')}</span>
                        <span className="property-location">{prop.city}</span>
                      </div>
                      <h3>{prop.title}</h3>
                      {prop.description && <p>{prop.description.length > 140 ? prop.description.slice(0, 140) + '...' : prop.description}</p>}
                      <div className="property-stats">
                        {prop.area_sqft && (
                          <div className="property-stat">
                            <span className="property-stat-value">{prop.area_sqft.toLocaleString()} ft&sup2;</span>
                            <span className="property-stat-label">Area</span>
                          </div>
                        )}
                        {prop.bedrooms != null && (
                          <div className="property-stat">
                            <span className="property-stat-value">{prop.bedrooms}</span>
                            <span className="property-stat-label">Beds</span>
                          </div>
                        )}
                        {prop.bathrooms != null && (
                          <div className="property-stat">
                            <span className="property-stat-value">{prop.bathrooms}</span>
                            <span className="property-stat-label">Baths</span>
                          </div>
                        )}
                        {prop.yield_percentage != null && (
                          <div className="property-stat">
                            <span className="property-stat-value">{prop.yield_percentage}%</span>
                            <span className="property-stat-label">Yield</span>
                          </div>
                        )}
                        <div className="property-stat">
                          <span className="property-stat-value">{prop.price ? `${prop.currency} ${prop.price.toLocaleString()}` : 'On Request'}</span>
                          <span className="property-stat-label">Price</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEnquire(prop.id)}
                        className="property-cta"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                      >
                        Enquire Now &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}


            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  SERVICES  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">Full-lifecycle real estate advisory and facilitation &mdash; from opportunity identification to asset management.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">analytics</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Investment Advisory</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Market analysis, opportunity identification, and investment structuring for institutional and private investors evaluating real estate across Pakistan, the UK, UAE, and Europe.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">domain</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">CPEC Corridor Properties</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Access to commercial and industrial properties in CPEC Special Economic Zones — Gwadar, Rashakai, Allama Iqbal, and Dhabeji SEZs — where infrastructure investment is driving rapid appreciation.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">flight</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Diaspora Investment Gateway</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Structured investment vehicles for overseas Pakistanis — from the UAE, UK, US, and Gulf — seeking home market real estate exposure with international-standard transparency and reporting.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">verified</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Due Diligence & Title Verification</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Comprehensive property due diligence, title verification, legal review, and risk assessment across every market we operate in — eliminating the opacity that deters international investors.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">apartment</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Property Management</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Ongoing asset management, tenant coordination, rental collection, and maintenance supervision for investors who want hands-off ownership with full visibility.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">account_balance</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Structured Investment Vehicles</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Deal-by-deal or pooled investment structures with clean legal frameworks, regular reporting, and defined exit mechanisms — the institutional approach to international real estate.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  CPEC FOCUS  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 fade-in-left">
              <div>
                <h3 className="cinzel-text text-2xl md:text-3xl font-semibold text-on-surface mb-6">CPEC corridor <span className="text-primary">opportunity.</span></h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed mb-4">The China-Pakistan Economic Corridor is creating 9 Special Economic Zones across the country — from Gwadar port in the south to Rashakai in the north. Each zone brings new infrastructure, industrial capacity, and commercial demand.</p>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed mb-4">Commercial properties — warehousing, logistics facilities, office space, and worker housing — are severely underbuilt relative to projected demand. Early positioning in these zones offers significant appreciation potential alongside strong rental yields of 6&ndash;8% annually.</p>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">CZAAH's on-the-ground presence and regulatory expertise allows investors to access these opportunities before they reach the broader market.</p>
              </div>
              <div>
                <h3 className="cinzel-text text-2xl md:text-3xl font-semibold text-on-surface mb-6">Target <span className="text-primary">locations.</span></h3>
                <div className="flex flex-wrap gap-3 mb-6">
                  <span className="border border-outline-variant/20 px-4 py-2 text-on-surface-variant text-sm">Islamabad</span>
                  <span className="border border-outline-variant/20 px-4 py-2 text-on-surface-variant text-sm">Lahore</span>
                  <span className="border border-outline-variant/20 px-4 py-2 text-on-surface-variant text-sm">Karachi</span>
                  <span className="border border-outline-variant/20 px-4 py-2 text-on-surface-variant text-sm">Gwadar</span>
                  <span className="border border-outline-variant/20 px-4 py-2 text-on-surface-variant text-sm">CPEC Industrial Zones</span>
                </div>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Our focus is commercial and industrial properties in high-growth corridors — tangible assets with rental yield and appreciation upside, not speculative residential plots.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  DIASPORA  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Diaspora & international <span className="text-primary">investors.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">Millions of overseas Pakistanis and international investors want Pakistan real estate exposure — but lack trusted, structured access. We solve that.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-3">UAE & Gulf Investors</h4>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Invest through our international frameworks with familiar jurisdiction, USD-denominated transactions, and international-standard legal frameworks. No need to navigate Pakistan's property registration system directly.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-3">UK & US Diaspora</h4>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Structured access for Western-based investors who want Pakistan real estate exposure without the friction of direct local transactions, land title complexities, and regulatory navigation.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Institutional Investors</h4>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Professional fund-style structures, regular reporting, independent valuations, clean title verification, and defined exit mechanisms — the institutional approach to Pakistan real estate that the market needs.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Flexible Participation</h4>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Invest in specific properties on a deal-by-deal basis or through pooled vehicles — flexibility to match your risk appetite, capital allocation preferences, and desired level of involvement.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  STATS  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in-scale">
          <div className="max-w-[1600px] mx-auto text-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger">
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">$300B+</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Pakistan real estate market value</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">9</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">CPEC Special Economic Zones</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">9M+</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Overseas Pakistanis worldwide</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">6&ndash;8%</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Prime commercial rental yields</div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  WHY CZAAH  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Why <span className="text-primary">CZAAH.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">What makes us different from every other real estate firm operating across our markets.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">location_on</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">On-the-Ground Expertise</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">London-based with on-the-ground presence across Pakistan's key property markets, plus partnerships across the UK, UAE, and Europe. We conduct physical due diligence, verify titles in person, and maintain direct relationships with developers and authorities.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">fact_check</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">End-to-End Due Diligence</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Title verification, legal review, market valuation, and risk assessment — we remove the opacity and uncertainty that has historically deterred international investment across emerging and established real estate markets alike.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">insights</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">CPEC Corridor Intelligence</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Deep knowledge of CPEC development timelines, SEZ progress, and infrastructure rollout — allowing our investors to position ahead of the market in the highest-growth corridors.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">gavel</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">Institutional-Grade Structures</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Clean legal frameworks, regular reporting, independent valuations, and defined exit mechanisms. We bring institutional discipline to a market that has traditionally lacked it.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-6">Position your capital in <span className="text-primary">international growth corridors.</span></h2>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mx-auto mb-10">Pakistan's CPEC corridors, UK and UAE commercial hubs, and European residency-linked property &mdash; through a single institutional counterparty.</p>
            <a href="/contact?interest=Real%20Estate#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Discuss Opportunities &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
