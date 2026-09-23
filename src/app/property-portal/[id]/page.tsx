'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LiveProperty, LISTING_META, resolveImage, formatPrice, CURRENCIES, isNewListing, listedAgo, isRental, FURNISHING_LABEL } from '../_components/types';
import { Lightbox } from '../_components/Lightbox';
import { AcquisitionCost } from '../_components/AcquisitionCost';
import { PropertyCard } from '../_components/PropertyCard';
import { useWishlist, useCurrencyPref } from '../_components/usePortalPrefs';


export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [prop, setProp] = useState<LiveProperty | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [enquiring, setEnquiring] = useState(false);
  const [ccy, setCcy] = useState('');
  const [lightbox, setLightbox] = useState(-1);
  const [similar, setSimilar] = useState<LiveProperty[]>([]);
  const [enquireError, setEnquireError] = useState('');
  const { has, toggle, ready: wlReady } = useWishlist();
  const { currency: prefCcy } = useCurrencyPref();

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

  // Onward exploration: other live listings, nearest first (same city, then
  // same country, then anything). Loaded separately so a failure here never
  // blocks the property itself from rendering.
  useEffect(() => {
    if (!prop) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/properties');
        const json = await res.json().catch(() => null);
        if (!res.ok || cancelled) return;
        const others = (json?.data || []).filter((p) => p.id !== prop.id);
        const score = (p) =>
          (isRental(p) === isRental(prop) ? 0 : 3) +
          (p.city === prop.city ? 0 : p.country === prop.country ? 1 : 2) +
          (p.property_type === prop.property_type ? 0 : 0.5);
        setSimilar(others.sort((a, b) => score(a) - score(b)).slice(0, 3));
      } catch {
        /* onward links are a nice-to-have, never an error state */
      }
    })();
    return () => { cancelled = true; };
  }, [prop]);

  async function handleEnquire() {
    if (!prop) return;
    setEnquiring(true);
    setEnquireError('');
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
      // Keep the visitor on whichever host they're browsing. Hardcoding
      // czaah.com threw portal visitors onto the group domain mid-enquiry,
      // and sent local dev straight to production.
      if (res.ok && json.redirect) {
        window.location.href = json.redirect;
      } else if (res.ok && json.data?.id) {
        window.location.href = `/dashboard/property-chats?id=${json.data.id}`;
      } else {
        setEnquireError(json.error || 'Could not start an enquiry. Please try again.');
      }
    } catch {
      setEnquireError('Could not start an enquiry. Please try again.');
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

  // Tenancy terms — only for rent/lease listings, and only the ones provided.
  const rental = isRental(prop);
  const money = (n: number) => `${prop.currency} ${Number(n).toLocaleString()}`;
  const availableLabel = prop.available_from
    ? new Date(prop.available_from) <= new Date()
      ? 'Now'
      : new Date(prop.available_from).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const rentTerms = rental
    ? ([
        prop.price && { k: prop.rent_period === 'year' ? 'Annual rent' : 'Monthly rent', v: money(prop.price) },
        prop.price && prop.rent_period === 'year' && { k: 'Monthly equivalent', v: `≈ ${money(Math.round(prop.price / 12))}` },
        prop.deposit != null && { k: 'Deposit', v: money(prop.deposit) },
        availableLabel && { k: 'Available', v: availableLabel },
        prop.min_term_months != null && {
          k: 'Minimum term',
          v: prop.min_term_months % 12 === 0
            ? `${prop.min_term_months / 12} year${prop.min_term_months === 12 ? '' : 's'}`
            : `${prop.min_term_months} month${prop.min_term_months === 1 ? '' : 's'}`,
        },
        prop.furnishing && { k: 'Furnishing', v: FURNISHING_LABEL[prop.furnishing] || prop.furnishing },
      ].filter(Boolean) as { k: string; v: string }[])
    : [];

  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> /{' '}
          {rental
            ? <Link href="/property-portal/rent">Rent</Link>
            : <Link href="/property-portal/buy">Buy</Link>} / {prop.title}
        </div>

        <div className="pp-detail">
          <h1 className="pp-detail-title">{prop.title}</h1>
          <div className="pp-detail-loc">
            <span className="pp-gold">◆</span> {prop.location}, {prop.city}
            {prop.country ? `, ${prop.country}` : ''}
            {isNewListing(prop) && <span className="pp-detail-new">New</span>}
            {listedAgo(prop) && <span className="pp-detail-added">{listedAgo(prop)}</span>}
            <button
              type="button"
              className={`pp-detail-save${wlReady && has(prop.id) ? ' is-saved' : ''}`}
              aria-pressed={wlReady && has(prop.id)}
              onClick={() => toggle(prop.id)}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill={wlReady && has(prop.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M12 20s-7-4.6-7-9.3A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.7C19 15.4 12 20 12 20Z" />
              </svg>
              {wlReady && has(prop.id) ? 'Saved' : 'Save'}
            </button>
          </div>

          {/* Gallery — click any image to open the full-screen viewer. */}
          <div className={`pp-gallery${rest.length === 0 ? ' pp-gallery--single' : ''}`}>
            {main ? (
              <button
                type="button"
                className="pp-gallery-main-btn"
                onClick={() => setLightbox(0)}
                aria-label={`Open gallery — ${images.length} image${images.length === 1 ? '' : 's'}`}
              >
                <img className="pp-gallery-main" src={main} alt={prop.title} />
                <span className="pp-gallery-count">
                  {images.length} photo{images.length === 1 ? '' : 's'}
                </span>
              </button>
            ) : (
              <div className="pp-gallery-main pp-card-img--empty">⌂</div>
            )}
            {rest.length > 0 && (
              <div className="pp-gallery-side">
                {rest.slice(0, 2).map((src, i) => (
                  <button
                    type="button"
                    key={i}
                    className="pp-gallery-thumb"
                    onClick={() => setLightbox(i + 1)}
                    aria-label={`Open image ${i + 2}`}
                  >
                    <img src={src} alt={`${prop.title} ${i + 2}`} />
                    {i === 1 && rest.length > 2 && (
                      <span className="pp-gallery-more">+{rest.length - 2} more</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {lightbox >= 0 && images.length > 0 && (
            <Lightbox
              images={images}
              index={lightbox}
              alt={prop.title}
              onClose={() => setLightbox(-1)}
              onIndex={setLightbox}
            />
          )}

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

              {rentTerms.length > 0 && (
                <div className="pp-detail-section">
                  <h2>Tenancy Terms</h2>
                  <div className="pp-spec-grid">
                    {rentTerms.map((s) => (
                      <div className="pp-spec" key={s.k}>
                        <span>{s.k}</span>
                        <b>{s.v}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <AcquisitionCost prop={prop} displayCurrency={ccy || prefCcy || undefined} />

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
              <div className="pp-enquire-price">{formatPrice(prop, ccy || prefCcy || undefined)}</div>
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
                {availableLabel && (
                  <div><span>Available</span><b>{availableLabel}</b></div>
                )}
              </div>
              <button
                className="pp-btn pp-btn--gold"
                onClick={handleEnquire}
                disabled={enquiring}
              >
                {enquiring ? 'Starting…' : rental ? 'Enquire About This Rental' : 'Enquire About This Property'}
              </button>
              {enquireError && <p className="pp-sell-err">{enquireError}</p>}
              <Link
                href={`/property-portal/contact?ref=${encodeURIComponent(prop.title)}`}
                className="pp-btn pp-btn--ghost"
              >
                Book a Call
              </Link>
              <p className="pp-enquire-note">
                Handled directly by the CZAAH Properties team — one point of contact from viewing
                to completion.
              </p>
            </aside>
          </div>

          {similar.length > 0 && (
            <section className="pp-detail-section pp-similar">
              <div className="pp-section-head">
                <h2>You might also consider</h2>
                <Link href="/property-portal/listings" className="pp-link-arrow">
                  Browse all listings →
                </Link>
              </div>
              <div className="pp-grid">
                {similar.map((p) => <PropertyCard key={p.id} prop={p} />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
