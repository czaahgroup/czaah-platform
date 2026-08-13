'use client';
// @ts-nocheck

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';
import { createClient } from '@/lib/supabase/client';

interface LiveProperty {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  price: number | null;
  currency: string;
  location: string;
  city: string;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  description: string | null;
  features: string[];
  images: string[];
}

export default function RealEstatePage() {
  const router = useRouter();
  const supabase = createClient();
  const [liveProperties, setLiveProperties] = useState<LiveProperty[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [filterCity, setFilterCity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  useEffect(() => {
    async function fetchLive() {
      try {
        const params = new URLSearchParams();
        if (filterCity) params.set('city', filterCity);
        if (filterType) params.set('type', filterType);
        if (filterMinPrice) params.set('min_price', filterMinPrice);
        if (filterMaxPrice) params.set('max_price', filterMaxPrice);
        const res = await fetch(`/api/public/properties?${params.toString()}`);
        const json = await res.json();
        if (res.ok) setLiveProperties(json.data || []);
      } catch (err) {
        console.error('Failed to load live properties:', err);
      } finally {
        setLiveLoading(false);
      }
    }
    fetchLive();
  }, [filterCity, filterType, filterMinPrice, filterMaxPrice]);

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

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));

        // Property search & filter
        const searchInput = document.getElementById('propertySearch');
        const filterLocation = document.getElementById('filterLocation');
        const filterType = document.getElementById('filterType');
        const filterStatus = document.getElementById('filterStatus');
        const filterPrice = document.getElementById('filterPrice');
        const clearBtn = document.getElementById('clearFilters');
        const resultsCount = document.getElementById('resultsCount');
        const grid = document.getElementById('propertiesGrid');
        const cards = grid.querySelectorAll('.property-card');

        function filterProperties() {
          const query = searchInput.value.toLowerCase().trim();
          const loc = filterLocation.value.toLowerCase();
          const type = filterType.value.toLowerCase();
          const status = filterStatus.value.toLowerCase();
          const priceRange = filterPrice.value;

          let visible = 0;

          cards.forEach(card => {
            const cardLoc = card.dataset.location;
            const cardType = card.dataset.type;
            const cardStatus = card.dataset.status;
            const cardPrice = parseInt(card.dataset.price);
            const cardKeywords = card.dataset.keywords;
            const cardText = card.textContent.toLowerCase();

            let show = true;

            // Text search
            if (query && !cardText.includes(query) && !cardKeywords.includes(query)) {
              show = false;
            }

            // Location filter
            if (loc && cardLoc !== loc) {
              show = false;
            }

            // Type filter
            if (type && cardType !== type) {
              show = false;
            }

            // Status filter
            if (status && cardStatus !== status) {
              show = false;
            }

            // Price filter
            if (priceRange) {
              const [min, max] = priceRange.split('-').map(Number);
              if (cardPrice < min || cardPrice > max) {
                show = false;
              }
            }

            card.classList.toggle('hidden', !show);
            if (show) visible++;
          });

          resultsCount.innerHTML = '<span>' + visible + '</span> propert' + (visible === 1 ? 'y' : 'ies') + ' found';

          // Show no results message
          const existing = grid.querySelector('.no-results');
          if (existing) existing.remove();

          if (visible === 0) {
            const msg = document.createElement('div');
            msg.className = 'no-results';
            msg.innerHTML = '<h3>No properties match your criteria</h3><p>Try adjusting your filters or search terms.</p>';
            grid.appendChild(msg);
          }
        }

        searchInput.addEventListener('input', filterProperties);
        filterLocation.addEventListener('change', filterProperties);
        filterType.addEventListener('change', filterProperties);
        filterStatus.addEventListener('change', filterProperties);
        filterPrice.addEventListener('change', filterProperties);

        clearBtn.addEventListener('click', () => {
          searchInput.value = '';
          filterLocation.value = '';
          filterType.value = '';
          filterStatus.value = '';
          filterPrice.value = '';
          filterProperties();
        });
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

        {/*  AVAILABLE PROPERTIES (Live from partners)  */}
        {(!liveLoading && liveProperties.length > 0) && (
          <>
            <section className="py-32 px-5 md:px-24 bg-surface fade-in">
              <div className="max-w-[1600px] mx-auto">
                <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Available <span className="text-primary">properties.</span></h2>
                <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-6">Browse approved property listings from our verified real estate partners. Enquire directly to start a conversation.</p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px', marginBottom: '24px' }}>
                  <select className="filter-select" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
                    <option value="">All Cities</option>
                    <option value="Islamabad">Islamabad</option>
                    <option value="Lahore">Lahore</option>
                    <option value="Karachi">Karachi</option>
                    <option value="Gwadar">Gwadar</option>
                    <option value="Peshawar">Peshawar</option>
                  </select>
                  <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="land">Land</option>
                    <option value="mixed_use">Mixed Use</option>
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
                </div>

                <div className="properties-grid">
                  {liveProperties.map((prop) => (
                    <div key={prop.id} className="property-card">
                      <div className="property-img-wrapper">
                        {prop.images && prop.images.length > 0 ? (
                          <img className="property-img" src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/platform-files/${prop.images[0]}`} alt={prop.title} />
                        ) : (
                          <div className="property-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '32px' }}>&#8962;</div>
                        )}
                        <span className="property-status status-available" style={{ textTransform: 'capitalize' }}>{prop.listing_type}</span>
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
                  ))}
                </div>
              </div>
            </section>

            <div className="w-full h-px bg-outline-variant/20" />
          </>
        )}

        {/*  FEATURED PROPERTIES  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Your Expert Property Finder in London</div>
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Featured <span className="text-primary">properties.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-2">Hand-selected investment opportunities across our international real estate markets. Each listing is pre-vetted, title-verified, and investment-ready.</p>

            <div className="search-panel">
              <div className="search-bar-row">
                <input type="text" className="search-bar" id="propertySearch" placeholder="Search by name, location, or keyword..." />
              </div>
              <div className="search-filters">
                <select className="filter-select" id="filterLocation">
                  <option value="">All Locations</option>
                  <option value="london">London</option>
                  <option value="islamabad">Islamabad</option>
                  <option value="lahore">Lahore</option>
                  <option value="karachi">Karachi</option>
                  <option value="gwadar">Gwadar</option>
                  <option value="cpec sez">CPEC SEZ</option>
                  <option value="dubai">Dubai</option>
                  <option value="riyadh">Riyadh</option>
                  <option value="doha">Doha</option>
                </select>
                <select className="filter-select" id="filterType">
                  <option value="">All Types</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="mixed-use">Mixed-Use</option>
                  <option value="commercial plot">Commercial Plot</option>
                </select>
                <select className="filter-select" id="filterStatus">
                  <option value="">All Status</option>
                  <option value="for-sale">For Sale</option>
                  <option value="off-plan">Off Plan</option>
                  <option value="available">Available</option>
                  <option value="limited">Limited Units</option>
                  <option value="coming">Coming Soon</option>
                </select>
                <select className="filter-select" id="filterPrice">
                  <option value="">Any Price</option>
                  <option value="0-1000000">Under $1M</option>
                  <option value="1000000-2000000">$1M &ndash; $2M</option>
                  <option value="2000000-99999999">$2M+</option>
                </select>
                <button className="clear-filters" id="clearFilters">Clear All</button>
              </div>
              <div className="search-results-count" id="resultsCount"><span>12</span> properties found</div>
            </div>

            <div className="properties-grid" id="propertiesGrid">

              <div className="property-card" data-location="london" data-type="commercial" data-status="for-sale" data-price="2900000" data-keywords="canary wharf grade-a office floor london city for sale">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=600&h=400&fit=crop" alt="Canary Wharf Office" />
                  <span className="property-status status-for-sale">For Sale</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Commercial</span>
                    <span className="property-location">London</span>
                  </div>
                  <h3>Canary Wharf &mdash; Grade-A Office Floor</h3>
                  <p>Full floor Grade-A office space in London's premier financial district. River views, 24/7 access, and proximity to Crossrail &mdash; fitted to institutional leasing standards.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">9,500 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">5.8%</span>
                      <span className="property-stat-label">Yield</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$2.9M</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="london" data-type="mixed-use" data-status="off-plan" data-price="1350000" data-keywords="nine elms riverside residences off plan pre-construction london new development">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop" alt="Nine Elms Development" />
                  <span className="property-status status-off-plan">Off Plan</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Mixed-Use</span>
                    <span className="property-location">London</span>
                  </div>
                  <h3>Nine Elms &mdash; Riverside Residences</h3>
                  <p>Off-plan residential-led mixed-use development on the South Bank, near the new US Embassy and Battersea Power Station. Early-stage pricing with staged payment plan ahead of completion.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">1,100 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">5.2%</span>
                      <span className="property-stat-label">Yield</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$1.35M</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="london" data-type="mixed-use" data-status="limited" data-price="1950000" data-keywords="mayfair boutique retail unit london west end">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&h=400&fit=crop" alt="Mayfair Retail Unit" />
                  <span className="property-status status-limited">Limited Units</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Mixed-Use</span>
                    <span className="property-location">London</span>
                  </div>
                  <h3>Mayfair &mdash; Boutique Retail &amp; Office</h3>
                  <p>Prime mixed-use unit in the heart of Mayfair, steps from Bond Street. Ground-floor retail with office space above &mdash; freehold, with strong footfall and heritage frontage.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">4,100 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">4.9%</span>
                      <span className="property-stat-label">Yield</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$1.95M</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="dubai" data-type="commercial" data-status="available" data-price="950000" data-keywords="business bay freehold office suite dubai uae">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop" alt="Dubai Business Bay Office" />
                  <span className="property-status status-available">Available</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Commercial</span>
                    <span className="property-location">Dubai</span>
                  </div>
                  <h3>Business Bay &mdash; Freehold Office Suite</h3>
                  <p>Freehold office suite in Dubai's Business Bay, overlooking the canal. Tax-free returns, fully fitted, and positioned within one of the UAE's fastest-growing commercial districts.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">2,800 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">8.1%</span>
                      <span className="property-stat-label">Yield</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$950K</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="riyadh" data-type="commercial" data-status="available" data-price="1650000" data-keywords="king abdullah financial district office riyadh saudi vision 2030">
                <div className="property-img-wrapper">
                  <img className="property-img" src="/Images/Riyadh-KAFD.jpg" alt="King Abdullah Financial District, Riyadh" />
                  <span className="property-status status-available">Available</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Commercial</span>
                    <span className="property-location">Riyadh</span>
                  </div>
                  <h3>King Abdullah Financial District &mdash; Office Suite</h3>
                  <p>Grade-A office space in Riyadh's flagship financial district, part of the Vision 2030 development pipeline. Foreign ownership permitted under recent reforms, with strong institutional-grade tenancy demand.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">3,400 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">6.5%</span>
                      <span className="property-stat-label">Yield</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$1.65M</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="doha" data-type="mixed-use" data-status="for-sale" data-price="1100000" data-keywords="pearl qatar freehold residential doha world cup legacy">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=600&h=400&fit=crop" alt="The Pearl Qatar Residence" />
                  <span className="property-status status-for-sale">For Sale</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Mixed-Use</span>
                    <span className="property-location">Doha</span>
                  </div>
                  <h3>The Pearl &mdash; Freehold Waterfront Residence</h3>
                  <p>Freehold apartment on Doha's Pearl Island, one of Qatar's few designated foreign-ownership zones. Residency-linked for qualifying investment, with strong rental demand from the expatriate community.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">1,850 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">6.8%</span>
                      <span className="property-stat-label">Yield</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$1.1M</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="islamabad" data-type="commercial" data-status="available" data-price="1800000" data-keywords="blue area office tower full floor grade-a margalla hills">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop" alt="Commercial Tower" />
                  <span className="property-status status-available">Available</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Commercial</span>
                    <span className="property-location">Islamabad</span>
                  </div>
                  <h3>Blue Area Office Tower &mdash; Full Floor</h3>
                  <p>Premium Grade-A office space in Islamabad's prime Blue Area district. 12,000 sq ft full floor with panoramic Margalla Hills views, fitted to international standards.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">12,000 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">7.2%</span>
                      <span className="property-stat-label">Yield</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$1.8M</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="lahore" data-type="industrial" data-status="available" data-price="2400000" data-keywords="sundar industrial estate warehouse complex logistics motorway">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=600&h=400&fit=crop" alt="Industrial Warehouse" />
                  <span className="property-status status-available">Available</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Industrial</span>
                    <span className="property-location">Lahore</span>
                  </div>
                  <h3>Sundar Industrial Estate &mdash; Warehouse Complex</h3>
                  <p>Modern logistics and warehousing facility on the Lahore&ndash;Karachi motorway corridor. 40,000 sq ft with loading docks, 24/7 security, and CPEC freight connectivity.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">40,000 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">8.5%</span>
                      <span className="property-stat-label">Yield</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$2.4M</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="karachi" data-type="mixed-use" data-status="limited" data-price="1200000" data-keywords="clifton commercial centre retail office mixed-use">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop" alt="Mixed-Use Development" />
                  <span className="property-status status-limited">Limited Units</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Mixed-Use</span>
                    <span className="property-location">Karachi</span>
                  </div>
                  <h3>Clifton Commercial Centre &mdash; Retail &amp; Office</h3>
                  <p>Prime mixed-use development in Karachi's Clifton district. Ground-floor retail with upper office floors, high footfall location near major residential communities.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">8,500 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">6.8%</span>
                      <span className="property-stat-label">Yield</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$1.2M</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="gwadar" data-type="commercial plot" data-status="coming" data-price="850000" data-keywords="gwadar free zone commercial plot port cpec tax-free">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=600&h=400&fit=crop" alt="Gwadar Port Area" />
                  <span className="property-status status-coming">Coming Soon</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Commercial Plot</span>
                    <span className="property-location">Gwadar</span>
                  </div>
                  <h3>Gwadar Free Zone &mdash; Commercial Plot</h3>
                  <p>Strategic commercial plot within Gwadar Free Zone Phase II. Tax-exempt zone with direct port access, positioned for the next wave of CPEC-driven development.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">2 Acres</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">Tax-Free</span>
                      <span className="property-stat-label">Zone</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$850K</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Register Interest &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="cpec sez" data-type="industrial" data-status="available" data-price="1600000" data-keywords="rashakai sez manufacturing unit kpk tax holiday motorway">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=600&h=400&fit=crop" alt="SEZ Industrial" />
                  <span className="property-status status-available">Available</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Industrial</span>
                    <span className="property-location">CPEC SEZ</span>
                  </div>
                  <h3>Rashakai SEZ &mdash; Manufacturing Unit</h3>
                  <p>Ready-to-operate manufacturing unit in the Rashakai Special Economic Zone, KPK. Incentivised tax structure, Chinese JV-ready infrastructure, and direct M-1 motorway access.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">25,000 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">10-yr</span>
                      <span className="property-stat-label">Tax Holiday</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$1.6M</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

              <div className="property-card" data-location="islamabad" data-type="commercial" data-status="limited" data-price="620000" data-keywords="f-7 markaz premium office suites diplomatic zone parking">
                <div className="property-img-wrapper">
                  <img className="property-img" src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop" alt="Corporate Office" />
                  <span className="property-status status-limited">Limited Units</span>
                </div>
                <div className="property-body">
                  <div className="property-tags">
                    <span className="property-type">Commercial</span>
                    <span className="property-location">Islamabad</span>
                  </div>
                  <h3>F-7 Markaz &mdash; Premium Office Suites</h3>
                  <p>Boutique office suites in Islamabad's F-7 Markaz, ideal for corporate HQs and embassy-area presence. Fully fitted, 24/7 access, underground parking, diplomatic zone proximity.</p>
                  <div className="property-stats">
                    <div className="property-stat">
                      <span className="property-stat-value">3,200 ft&sup2;</span>
                      <span className="property-stat-label">Area</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">7.5%</span>
                      <span className="property-stat-label">Yield</span>
                    </div>
                    <div className="property-stat">
                      <span className="property-stat-value">$620K</span>
                      <span className="property-stat-label">Price</span>
                    </div>
                  </div>
                  <a href="/contact#contact-form" className="property-cta">Request Details &rarr;</a>
                </div>
              </div>

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
