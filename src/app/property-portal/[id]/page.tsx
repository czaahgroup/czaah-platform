'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LiveProperty, LISTING_META, resolveImage, formatPrice, CURRENCIES } from '../_components/types';


export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [prop, setProp] = useState<LiveProperty | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [enquiring, setEnquiring] = useState(false);
  const [ccy, setCcy] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/properties/${id}`);
        const json = await res.json();
        if (res.ok && json.data) {
          setProp(json.data);
          setState('ready');
        } else {
          setState('notfound');
        }
      } catch {
        setState('notfound');
      }
    }
    load();
  }, [id]);

  async function handleEnquire() {
    if (!prop) return;
    setEnquiring(true);
    try {
      const res = await fetch('/api/property-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: prop.id }),
      });
      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(`/property-portal/${prop.id}`)}`);
        return;
      }
      const json = await res.json();
      if (res.ok && json.redirect) {
        window.location.href = json.redirect.startsWith('http')
          ? json.redirect
          : `https://czaah.com${json.redirect}`;
      } else if (res.ok && json.data?.id) {
        window.location.href = `https://czaah.com/dashboard/property-chats?id=${json.data.id}`;
      } else {
        alert(json.error || 'Could not start an enquiry. Please try again.');
      }
    } catch {
      alert('Could not start an enquiry. Please try again.');
    } finally {
      setEnquiring(false);
    }
  }

  if (state === 'loading') {
    return (
      <main>
        <div className="pp-container">
          <div className="pp-crumbs"><Link href="/property-portal/listings">Listings</Link> / …</div>
          <div style={{ padding: '32px 0 120px' }}>
            <div className="pp-skeleton" style={{ height: 440, marginBottom: 40 }} />
            <div className="pp-skeleton" style={{ height: 200 }} />
          </div>
        </div>
      </main>
    );
  }

  if (state === 'notfound' || !prop) {
    return (
      <main>
        <div className="pp-container">
          <div className="pp-cta-band" style={{ background: 'none' }}>
            <h2 className="pp-h2">Listing not found</h2>
            <p>This property may have been sold or withdrawn.</p>
            <Link href="/property-portal/listings" className="pp-btn pp-btn--gold">
              Back to Listings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const meta = LISTING_META[prop.listing_type] || { label: prop.listing_type, className: 'status-for-sale' };
  const images = (prop.images || []).map(resolveImage).filter(Boolean) as string[];
  const [main, ...rest] = images;
  const specs = [
    prop.property_type && { k: 'Type', v: prop.property_type.replace('_', ' ') },
    prop.listing_type && { k: 'Listing', v: meta.label },
    prop.bedrooms != null && { k: 'Bedrooms', v: prop.bedrooms === 0 ? 'Studio' : String(prop.bedrooms) },
    prop.bathrooms != null && { k: 'Bathrooms', v: String(prop.bathrooms) },
    prop.area_sqft != null && { k: 'Area', v: `${prop.area_sqft.toLocaleString()} ft²` },
    prop.yield_percentage != null && { k: 'Est. yield', v: `${prop.yield_percentage}%` },
    prop.city && { k: 'City', v: prop.city },
    prop.country && { k: 'Country', v: prop.country },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> /{' '}
          <Link href="/property-portal/listings">Listings</Link> / {prop.title}
        </div>

        <div className="pp-detail">
          <h1 className="pp-detail-title">{prop.title}</h1>
          <div className="pp-detail-loc">
            <span className="pp-gold">◆</span> {prop.location}, {prop.city}
            {prop.country ? `, ${prop.country}` : ''}
          </div>

          {/* Gallery */}
          <div className="pp-gallery">
            {main ? (
              <img className="pp-gallery-main" src={main} alt={prop.title} />
            ) : (
              <div className="pp-gallery-main pp-card-img--empty">⌂</div>
            )}
            {rest.length > 0 && (
              <div className="pp-gallery-side">
                {rest.slice(0, 2).map((src, i) => (
                  <img key={i} src={src} alt={`${prop.title} ${i + 2}`} />
                ))}
              </div>
            )}
          </div>

          <div className="pp-detail-body">
            <div className="pp-detail-main">
              {prop.description && (
                <div className="pp-detail-section">
                  <h2>Property Description</h2>
                  <div className="pp-detail-desc">{prop.description}</div>
                </div>
              )}

              <div className="pp-detail-section">
                <h2>Key Details</h2>
                <div className="pp-spec-grid">
                  {specs.map((s) => (
                    <div className="pp-spec" key={s.k}>
                      <span>{s.k}</span>
                      <b>{s.v}</b>
                    </div>
                  ))}
                </div>
              </div>

              {prop.features && prop.features.length > 0 && (
                <div className="pp-detail-section">
                  <h2>Features &amp; Amenities</h2>
                  <div className="pp-features">
                    {prop.features.map((f) => (
                      <span className="pp-feature" key={f}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Enquiry sidebar */}
            <aside className="pp-enquire-card">
              <div className="pp-enquire-price">{formatPrice(prop, ccy || undefined)}</div>
              <div className="pp-enquire-sub">
                {meta.label} · {prop.city}
                {prop.price != null && (
                  <select
                    className="pp-ccy-select"
                    value={ccy}
                    onChange={(e) => setCcy(e.target.value)}
                    aria-label="Display currency"
                  >
                    <option value="">{prop.currency}</option>
                    {CURRENCIES.filter((c) => c !== prop.currency).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pp-enquire-specs">
                {prop.bedrooms != null && (
                  <div><span>Bedrooms</span><b>{prop.bedrooms === 0 ? 'Studio' : prop.bedrooms}</b></div>
                )}
                {prop.bathrooms != null && (
                  <div><span>Bathrooms</span><b>{prop.bathrooms}</b></div>
                )}
                {prop.area_sqft != null && (
                  <div><span>Area</span><b>{prop.area_sqft.toLocaleString()} ft²</b></div>
                )}
                {prop.yield_percentage != null && (
                  <div><span>Est. yield</span><b>{prop.yield_percentage}%</b></div>
                )}
              </div>
              <button
                className="pp-btn pp-btn--gold"
                onClick={handleEnquire}
                disabled={enquiring}
              >
                {enquiring ? 'Starting…' : 'Enquire About This Property'}
              </button>
              <Link
                href={`/contact?interest=${encodeURIComponent(prop.title)}#contact-form`}
                className="pp-btn pp-btn--ghost"
              >
                Book a Call
              </Link>
              <p className="pp-enquire-note">
                Handled directly by the CZAAH Property team — one point of contact from viewing
                to completion.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
