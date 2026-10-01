'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LiveProperty, LISTING_META, resolveImage, formatPrice, CURRENCIES, isNewListing, listedAgo, isRental, FURNISHING_LABEL } from '../_components/types';
import { Gallery } from '../_components/Gallery';
import { AcquisitionCost } from '../_components/AcquisitionCost';
import { PropertyCard } from '../_components/PropertyCard';
import { useWishlist, useCurrencyPref } from '../_components/usePortalPrefs';
import { TENURE_LABEL, BUILD_STATUS_LABEL, yieldLabel } from '@/lib/marketFields';
import { EnquiryForm, ContactButtons, ShareButton, StickyActions, listingReference, whatsappHref } from '../_components/PropertyActions';
import { slugForCity } from '../_components/destinations';
import { track } from '../_components/analytics';
import { ListingLocationMap } from '../_components/ListingsMap';

const TYPE_LABEL = { residential: 'Residential', commercial: 'Commercial', industrial: 'Industrial', mixed_use: 'Mixed use', land: 'Land' };

// `initial` is the listing as loaded by the server page, so the photographs,
// price and description are in the first HTML. Without it (the server lookup
// failed) the page loads the listing itself, as it always did.
export default function ListingView({ initial = null }: { initial?: LiveProperty | null }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [prop, setProp] = useState<LiveProperty | null>(initial);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>(initial ? 'ready' : 'loading');
  const [enquiring, setEnquiring] = useState(false);
  const [ccy, setCcy] = useState('');
  const [similar, setSimilar] = useState<LiveProperty[]>([]);
  const [enquireError, setEnquireError] = useState('');
  const { has, toggle, ready: wlReady } = useWishlist();
  const [enquiryMode, setEnquiryMode] = useState<'enquiry' | 'viewing'>('enquiry');
  const { currency: prefCcy } = useCurrencyPref();

  useEffect(() => {
    if (initial) return;
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
  }, [id, initial]);

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
        setSimilar(others.sort((a, b) => score(a) - score(b)).slice(0, 4));
      } catch {
        /* onward links are a nice-to-have, never an error state */
      }
    })();
    return () => { cancelled = true; };
  }, [prop]);

  useEffect(() => {
    if (prop?.id) track('property_view', { listing_id: prop.id });
  }, [prop?.id]);

  /** Bring the request form into view in the chosen mode and focus it. */
  function openForm(mode: 'enquiry' | 'viewing') {
    if (mode === 'viewing' && enquiryMode !== 'viewing') track('viewing_started', { listing_id: prop?.id });
    setEnquiryMode(mode);
    // The form may be showing its "received" state, in which case there is no
    // #enquiry-form to find; scroll to the card instead.
    setTimeout(() => {
      const form = document.getElementById('enquiry-form') || document.getElementById('enquiry-card');
      form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => form?.querySelector<HTMLInputElement>('input:not([tabindex="-1"])')?.focus({ preventScroll: true }), 400);
    }, 0);
  }

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
          <div className="pp-crumbs"><Link href="/property-portal/listings">Properties</Link> / …</div>
          <div style={{ padding: '32px 0 120px' }}>
            <div className="pp-skeleton" style={{ height: 440, marginBottom: 40, aspectRatio: 'auto' }} />
            <div className="pp-skeleton" style={{ height: 200, aspectRatio: 'auto' }} />
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
            <h2 className="pp-h2">Property not found</h2>
            <p>This property may have been sold or withdrawn.</p>
            <Link href="/property-portal/listings" className="pp-btn pp-btn--gold">
              Browse properties
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const meta = LISTING_META[prop.listing_type] || { label: prop.listing_type, className: 'status-for-sale' };
  const images = (prop.images || []).map(resolveImage).filter(Boolean) as string[];
  const typeLabel = prop.property_type ? TYPE_LABEL[prop.property_type] || prop.property_type.replace('_', ' ') : null;
  const isSaved = wlReady && has(prop.id);
  const save = () => { if (!has(prop.id)) track('property_save', { listing_id: prop.id }); toggle(prop.id); };
  const place = [prop.location, prop.city, prop.country].filter(Boolean).join(', ');
  const shownCcy = ccy || prefCcy || undefined;

  // The headline facts, shown under the price. Only what the listing states.
  const keyFacts = [
    prop.bedrooms != null && { k: 'Bedrooms', v: prop.bedrooms === 0 ? 'Studio' : String(prop.bedrooms) },
    prop.bathrooms != null && { k: 'Bathrooms', v: String(prop.bathrooms) },
    prop.area_sqft != null && { k: 'Size', v: `${prop.area_sqft.toLocaleString('en-GB')} ft²` },
    typeLabel && { k: 'Type', v: typeLabel },
  ].filter(Boolean) as { k: string; v: string }[];

  const specs = [
    typeLabel && { k: 'Type', v: typeLabel },
    prop.listing_type && { k: 'Listing', v: meta.label },
    prop.bedrooms != null && { k: 'Bedrooms', v: prop.bedrooms === 0 ? 'Studio' : String(prop.bedrooms) },
    prop.bathrooms != null && { k: 'Bathrooms', v: String(prop.bathrooms) },
    prop.area_sqft != null && { k: 'Area', v: `${prop.area_sqft.toLocaleString('en-GB')} ft²` },
    // A yield always carries its source; an unlabelled one is the seller's.
    prop.yield_percentage != null && { k: yieldLabel(prop.yield_source), v: `${prop.yield_percentage}%` },
    prop.tenure && { k: 'Tenure', v: TENURE_LABEL[prop.tenure] || prop.tenure },
    prop.tenure === 'leasehold' && prop.lease_years_remaining != null && { k: 'Lease remaining', v: `${prop.lease_years_remaining} years` },
    prop.build_status && { k: 'Build', v: BUILD_STATUS_LABEL[prop.build_status] || prop.build_status },
    prop.council_tax_band && { k: 'Council tax band', v: prop.council_tax_band },
    prop.service_charge != null && { k: 'Service charge', v: `${prop.currency} ${Number(prop.service_charge).toLocaleString('en-GB')} / year` },
    prop.ground_rent != null && { k: 'Ground rent', v: `${prop.currency} ${Number(prop.ground_rent).toLocaleString('en-GB')} / year` },
    prop.completion_date && { k: 'Expected completion', v: new Date(prop.completion_date).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }) },
    prop.society && { k: 'Society', v: prop.society },
    prop.phase && { k: 'Phase', v: prop.phase },
    { k: 'Reference', v: listingReference(prop.id) },
  ].filter(Boolean) as { k: string; v: string }[];

  // Tenancy terms — only for rent/lease listings, and only the ones provided.
  const rental = isRental(prop);
  const money = (n: number) => `${prop.currency} ${Number(n).toLocaleString('en-GB')}`;
  const availableLabel = prop.available_from
    ? new Date(prop.available_from) <= new Date()
      ? 'Now'
      : new Date(prop.available_from).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
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

  const development = prop.development;
  const developer = development?.developer_name || prop.developer_name;
  const wa = whatsappHref(prop);

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
          <Gallery images={images} title={prop.title} />

          <div className="pp-detail-body">
            <div className="pp-detail-main">
              <header className="pp-listing-head">
                <div className="pp-listing-flags">
                  <span className={`pp-pcard-flag ${meta.className}`}>{meta.label}</span>
                  {isNewListing(prop) && <span className="pp-pcard-flag is-new">New</span>}
                  {prop.verified && (
                    <Link href="/property-portal/about#verification" className="pp-pcard-flag is-verified">
                      ✓ Verified by CZAAH
                    </Link>
                  )}
                  {listedAgo(prop) && <span className="pp-listing-added">{listedAgo(prop)}</span>}
                </div>
                <h1 className="pp-detail-title">{prop.title}</h1>
                {place && <p className="pp-listing-place">{place}</p>}
                <p className="pp-listing-price">{formatPrice(prop, shownCcy)}</p>
                {keyFacts.length > 0 && (
                  <dl className="pp-listing-facts">
                    {keyFacts.map((f) => (
                      <div key={f.k}>
                        <dt>{f.k}</dt>
                        <dd>{f.v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="pp-listing-tools">
                  <button
                    type="button"
                    className={`pp-detail-save${isSaved ? ' is-saved' : ''}`}
                    aria-pressed={isSaved}
                    onClick={save}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                      <path d="M12 20s-7-4.6-7-9.3A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.7C19 15.4 12 20 12 20Z" />
                    </svg>
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                  <ShareButton listing={prop} />
                </div>
              </header>

              {prop.description && (
                <section className="pp-detail-section" aria-labelledby="sec-overview">
                  <h2 id="sec-overview">Overview</h2>
                  <div className="pp-detail-desc">{prop.description}</div>
                </section>
              )}

              {prop.features && prop.features.length > 0 && (
                <section className="pp-detail-section" aria-labelledby="sec-features">
                  <h2 id="sec-features">Key features</h2>
                  <ul className="pp-features">
                    {prop.features.map((f) => (
                      <li className="pp-feature" key={f}>{f}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="pp-detail-section" aria-labelledby="sec-details">
                <h2 id="sec-details">Property details</h2>
                <div className="pp-spec-grid">
                  {specs.map((s) => (
                    <div className="pp-spec" key={s.k}>
                      <span>{s.k}</span>
                      <b>{s.v}</b>
                    </div>
                  ))}
                </div>
              </section>

              {rentTerms.length > 0 && (
                <section className="pp-detail-section" aria-labelledby="sec-tenancy">
                  <h2 id="sec-tenancy">Tenancy terms</h2>
                  <div className="pp-spec-grid">
                    {rentTerms.map((s) => (
                      <div className="pp-spec" key={s.k}>
                        <span>{s.k}</span>
                        <b>{s.v}</b>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <AcquisitionCost prop={prop} displayCurrency={shownCcy} />

              {place && (
                <section className="pp-detail-section" aria-labelledby="sec-location">
                  <h2 id="sec-location">Location</h2>
                  <p className="pp-detail-desc">{place}</p>
                  <ListingLocationMap prop={prop} />
                  {prop.city && (
                    <div className="pp-listing-links">
                      <Link href={`/property-portal/destinations/${slugForCity(prop.city)}`} className="pp-link-arrow">
                        About {prop.city} →
                      </Link>
                      <Link href={`/property-portal/${rental ? 'rent' : 'buy'}?search=${encodeURIComponent(prop.city)}`} className="pp-link-arrow">
                        More in {prop.city} →
                      </Link>
                    </div>
                  )}
                </section>
              )}

              {prop.video_url && (
                <section className="pp-detail-section" aria-labelledby="sec-video">
                  <h2 id="sec-video">Video</h2>
                  {/* Nothing downloads until the visitor presses play, and it never plays by itself. */}
                  <video
                    className="pp-listing-video"
                    src={prop.video_url}
                    poster={prop.video_poster_url || images[0] || undefined}
                    controls
                    playsInline
                    preload="none"
                  />
                </section>
              )}

              {(developer || development) && (
                <section className="pp-detail-section" aria-labelledby="sec-developer">
                  <h2 id="sec-developer">{development ? 'Development' : 'Developer'}</h2>
                  <div className="pp-spec-grid">
                    {development && (
                      <div className="pp-spec"><span>Development</span><b>{development.name}</b></div>
                    )}
                    {developer && (
                      <div className="pp-spec"><span>Developer</span><b>{developer}</b></div>
                    )}
                  </div>
                  {development?.slug && (
                    <div className="pp-listing-links">
                      <Link href={`/property-portal/developments/${development.slug}`} className="pp-link-arrow">
                        View the development →
                      </Link>
                    </div>
                  )}
                </section>
              )}

              {prop.payment_plan && (
                <section className="pp-detail-section" aria-labelledby="sec-plan">
                  <h2 id="sec-plan">Payment plan</h2>
                  <p className="pp-detail-desc">
                    This property is offered with a payment plan. Ask for the full schedule and we
                    will send it with the current terms.
                  </p>
                  <div className="pp-listing-links">
                    <button type="button" className="pp-link-btn" onClick={() => openForm('enquiry')}>Request the payment plan</button>
                    {development?.slug && (
                      <Link href={`/property-portal/developments/${development.slug}`} className="pp-link-arrow">
                        Plans on the development page →
                      </Link>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Request card — stays in view on desktop while the page scrolls.
                Book Viewing / Request Details are the form's own two tabs. */}
            <aside className="pp-enquire-card" id="enquiry-card">
              <div className="pp-enquire-price">{formatPrice(prop, shownCcy)}</div>
              <div className="pp-enquire-sub">
                {meta.label}{prop.city ? ` · ${prop.city}` : ''}
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
              <div className="pp-enquire-actions">
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="pp-btn pp-btn--ghost" onClick={() => track('whatsapp_click', { listing_id: prop.id, via: 'card' })}>Message Advisor</a>
                ) : (
                  <Link href={`/property-portal/contact?ref=${listingReference(prop.id)}`} className="pp-btn pp-btn--ghost" onClick={() => track('advisor_clicked', { via: 'listing', listing_id: prop.id })}>Message Advisor</Link>
                )}
                <button type="button" className={`pp-btn pp-btn--ghost${isSaved ? ' is-saved' : ''}`} aria-pressed={isSaved} onClick={save}>
                  {isSaved ? 'Saved' : 'Save Property'}
                </button>
              </div>
              <ContactButtons listing={prop} />
              <EnquiryForm listing={prop} mode={enquiryMode} onModeChange={setEnquiryMode} rental={rental} />
              {/* Partner listings keep the account-based chat with the agent. */}
              {prop.partner_id && (
                <>
                  <button type="button" className="pp-link-btn" onClick={handleEnquire} disabled={enquiring}>
                    {enquiring ? 'Opening…' : 'Or message the listing agent from your account'}
                  </button>
                  {enquireError && <p className="pp-sell-err">{enquireError}</p>}
                </>
              )}
              <p className="pp-enquire-note">
                Handled by the CZAAH Properties team — one point of contact from viewing to
                completion.
              </p>
            </aside>
          </div>

          {similar.length > 0 && (
            <section className="pp-detail-section pp-similar">
              <div className="pp-section-head">
                <h2>Similar properties</h2>
                <Link href="/property-portal/listings" className="pp-link-arrow">
                  Browse all properties →
                </Link>
              </div>
              <div className="pp-grid pp-grid--swipe">
                {similar.map((p) => <PropertyCard key={p.id} prop={p} />)}
              </div>
            </section>
          )}
        </div>
      </div>
      <StickyActions listing={prop} onEnquire={() => openForm('enquiry')} onViewing={() => openForm('viewing')} saved={isSaved} onSave={save} />
    </main>
  );
}
