'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const runtime = 'edge';

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
  images: string[];
  yield_percentage: number | null;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  sale: { label: 'For Sale', className: 'status-for-sale' },
  rent: { label: 'For Rent', className: 'status-for-rent' },
  lease: { label: 'For Rent', className: 'status-for-rent' },
  off_plan: { label: 'Off Plan', className: 'status-off-plan' },
};

const MARKETS = [
  { key: 'all', label: 'All Markets' },
  { key: 'london', label: 'London' },
  { key: 'dubai', label: 'Dubai' },
  { key: 'pakistan', label: 'Pakistan' },
];

function matchesMarket(prop: LiveProperty, market: string) {
  if (market === 'all') return true;
  if (market === 'london') return prop.city?.toLowerCase() === 'london';
  if (market === 'dubai') return prop.city?.toLowerCase() === 'dubai';
  if (market === 'pakistan') return prop.country?.toLowerCase() === 'pakistan';
  return true;
}

export default function PropertyPortalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<LiveProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState(searchParams.get('market') || 'all');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/public/properties?countries=' + encodeURIComponent('Pakistan,United Kingdom,United Arab Emirates'));
        const json = await res.json();
        if (res.ok) setProperties(json.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleEnquire(propertyId: string) {
    try {
      const res = await fetch('/api/property-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent('/property-portal')}`);
        return;
      }
      const json = await res.json();
      if (res.ok && json.redirect) {
        window.location.href = json.redirect.startsWith('http') ? json.redirect : `https://czaah.com${json.redirect}`;
      } else if (res.ok && json.data?.id) {
        window.location.href = `https://czaah.com/dashboard/property-chats?id=${json.data.id}`;
      } else {
        alert(json.error || 'Failed to start enquiry. Please try again.');
      }
    } catch {
      alert('Failed to start enquiry. Please try again.');
    }
  }

  const visible = properties.filter((p) => matchesMarket(p, market));

  return (
    <main className="pp-main">
      {/* HERO */}
      <section className="pp-hero">
        <div className="pp-hero-inner">
          <div className="pp-eyebrow">CZAAH Property Portal</div>
          <h1 className="pp-h1">Property investment across <span className="pp-gold">London, Dubai &amp; Pakistan.</span></h1>
          <p className="pp-lede">Pre-vetted, title-verified real estate opportunities across three of the world&apos;s most active property markets &mdash; structured access, local partnerships, and end-to-end transaction support from a single institutional counterparty.</p>
        </div>
      </section>

      {/* MARKET FILTERS */}
      <section className="pp-filters-section">
        <div className="pp-filters-inner">
          {MARKETS.map((m) => (
            <button
              key={m.key}
              className={`pp-filter-btn ${market === m.key ? 'active' : ''}`}
              onClick={() => setMarket(m.key)}
            >
              {m.label}
            </button>
          ))}
          <span className="pp-count">{loading ? 'Loading…' : `${visible.length} ${visible.length === 1 ? 'listing' : 'listings'}`}</span>
        </div>
      </section>

      {/* LISTINGS */}
      <section className="pp-listings-section">
        <div className="pp-listings-inner">
          <div className="properties-grid">
            {!loading && visible.length === 0 && (
              <div className="no-results">No listings currently available in this market.</div>
            )}
            {visible.map((prop) => {
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

      <style dangerouslySetInnerHTML={{ __html: `
        .pp-main { background: #050505; min-height: 100vh; }
        .pp-hero {
          padding: 80px 32px 56px;
          background: radial-gradient(circle at 20% 20%, rgba(201,168,76,0.08), transparent 60%);
        }
        .pp-hero-inner { max-width: 1000px; margin: 0 auto; }
        .pp-eyebrow {
          font-family: 'Raleway', sans-serif;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold, #C9A84C);
          margin-bottom: 20px;
        }
        .pp-h1 {
          font-family: 'Cinzel', serif;
          font-size: clamp(32px, 5vw, 56px);
          font-weight: 600;
          color: var(--white, #fff);
          line-height: 1.15;
          margin-bottom: 24px;
        }
        .pp-gold { color: var(--gold, #C9A84C); }
        .pp-lede {
          font-family: 'Raleway', sans-serif;
          font-size: 16px;
          line-height: 1.7;
          color: var(--white-muted, rgba(255,255,255,0.6));
          max-width: 640px;
        }
        .pp-filters-section {
          border-top: 1px solid var(--black-border, rgba(255,255,255,0.08));
          border-bottom: 1px solid var(--black-border, rgba(255,255,255,0.08));
          padding: 20px 32px;
        }
        .pp-filters-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pp-filter-btn {
          font-family: 'Raleway', sans-serif;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 9px 20px;
          border-radius: 6px;
          border: 1px solid var(--black-border, rgba(255,255,255,0.1));
          background: rgba(255,255,255,0.02);
          color: var(--white-muted, rgba(255,255,255,0.6));
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .pp-filter-btn:hover { border-color: rgba(201,168,76,0.3); color: var(--white, #fff); }
        .pp-filter-btn.active {
          background: var(--gold, #C9A84C);
          border-color: var(--gold, #C9A84C);
          color: #080808;
          font-weight: 600;
        }
        .pp-count {
          margin-left: auto;
          font-family: 'Raleway', sans-serif;
          font-size: 12px;
          color: var(--white-muted, rgba(255,255,255,0.5));
        }
        .pp-listings-section { padding: 48px 32px 96px; }
        .pp-listings-inner { max-width: 1400px; margin: 0 auto; }

        .properties-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
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
        .property-img-wrapper { position: relative; }
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
          color: var(--white);
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
          flex-wrap: wrap;
        }
        .property-stat { display: flex; flex-direction: column; gap: 2px; }
        .property-stat-value { font-size: 15px; font-weight: 600; color: var(--gold); }
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
          transition: all 0.3s var(--ease-out, ease);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .property-cta:hover { gap: 10px; color: var(--gold-light, var(--gold)); }
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
        .status-available, .status-for-sale {
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
        .no-results {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: var(--white-muted);
          font-family: 'Raleway', sans-serif;
          font-size: 14px;
        }
        @media (max-width: 1024px) {
          .properties-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .properties-grid { grid-template-columns: 1fr; }
        }
      `}} />
    </main>
  );
}
