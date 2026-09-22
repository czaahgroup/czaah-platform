'use client';
// @ts-nocheck

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { resolveImage, convertPrice } from '../../_components/types';
import { useCurrencyPref, useWishlist } from '../../_components/usePortalPrefs';
import { Lightbox } from '../../_components/Lightbox';
import {
  formatPlotSize,
  PLOT_CATEGORY_LABEL,
  POSSESSION_LABEL,
  DEVELOPMENT_STATUS_LABEL,
  AVAILABILITY_LABEL,
  PLOT_POSITION_FLAGS,
} from '@/lib/plots';
import { buildSchedule, formatMoney } from '@/lib/paymentPlan';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'plots', label: 'Available Plots' },
  { key: 'plan', label: 'Payment Plan' },
  { key: 'features', label: 'Features' },
  { key: 'location', label: 'Location' },
  { key: 'developer', label: 'Developer' },
  { key: 'contact', label: 'Contact' },
];

/** Price in the visitor's chosen currency, flagged as approximate. */
function displayPrice(amount, currency, display) {
  if (amount == null) return 'Price on request';
  if (display && display !== currency) {
    const converted = convertPrice(amount, currency, display);
    if (converted != null) return `~ ${display} ${Math.round(converted).toLocaleString()}`;
  }
  return formatMoney(amount, currency);
}

function PaymentPlanTable({ plan, currency, display }) {
  const rows = useMemo(() => buildSchedule({
    total_price: plan.total_price,
    down_payment: plan.down_payment,
    currency: plan.currency || currency,
    installments: plan.installments || [],
  }), [plan, currency]);

  if (!rows.length) return <p className="pp-detail-desc">Payment plan available on request.</p>;

  const ccy = plan.currency || currency;

  return (
    <div className="pp-plan">
      <table className="pp-plan-table">
        <thead>
          <tr>
            <th>Payment</th>
            <th>When</th>
            <th className="pp-plan-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.kind === 'additional' ? 'pp-plan-additional' : undefined}>
              <td>{row.label}</td>
              <td>{row.timing || '—'}</td>
              <td className="pp-plan-amount">{displayPrice(row.amount, ccy, display)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Total</td>
            <td className="pp-plan-amount">
              {displayPrice(plan.total_price ?? plan.scheduled_total, ccy, display)}
            </td>
          </tr>
        </tfoot>
      </table>
      {plan.duration_months ? (
        <p className="pp-plan-note">Payable over {plan.duration_months} months.</p>
      ) : null}
    </div>
  );
}

export default function DevelopmentPage() {
  const { slug } = useParams();
  const [dev, setDev] = useState(null);
  const [state, setState] = useState('loading');
  const [tab, setTab] = useState('overview');
  const [openPlan, setOpenPlan] = useState(null);
  const [lightbox, setLightbox] = useState(-1);
  const [copied, setCopied] = useState(false);
  const { currency: prefCcy } = useCurrencyPref();
  const { has, toggle, ready: wlReady } = useWishlist();

  // Enquiry form — the same desk endpoint the contact page uses, so a
  // logged-out visitor can enquire without being bounced to a login.
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [interest, setInterest] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/developments/${slug}`);
        const json = await res.json();
        if (res.ok && json.data) {
          setDev(json.data);
          setState('ready');
        } else {
          setState('notfound');
        }
      } catch {
        setState('notfound');
      }
    }
    load();
  }, [slug]);

  const units = useMemo(() => dev?.units || [], [dev]);
  const available = units.filter((u) => u.availability_status === 'available');

  // "From" price across the variants, in one currency so mixed-currency
  // schemes cannot show a smaller number that is actually larger.
  const fromPrice = useMemo(() => {
    const priced = units.filter((u) => u.total_price != null);
    if (!priced.length) return null;
    const best = priced.reduce((lowest, u) => {
      const a = convertPrice(u.total_price, u.currency, 'USD');
      const b = convertPrice(lowest.total_price, lowest.currency, 'USD');
      if (a == null || b == null) return lowest;
      return a < b ? u : lowest;
    });
    return best;
  }, [units]);

  function enquireAbout(unit) {
    setInterest(unit ? `${dev.name} — ${unit.title}` : dev.name);
    setTab('contact');
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        document.getElementById('pp-dev-contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  }

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: dev.name, url });
        return;
      } catch {
        // Cancelled, or unsupported despite the feature check — fall through.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  async function submitEnquiry(e) {
    e.preventDefault();
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          interest: `Property Portal — ${interest || dev.name}`,
          message: form.message,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSent(true);
      } else {
        setSendError(json?.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSendError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (state === 'loading') {
    return (
      <main className="pp-container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div className="pp-skeleton" style={{ height: 320 }} />
      </main>
    );
  }

  if (state === 'notfound' || !dev) {
    return (
      <main className="pp-container" style={{ paddingTop: 60, paddingBottom: 90 }}>
        <h1 className="pp-h2">Development not found</h1>
        <p className="pp-detail-desc">
          This development may have been unpublished. <Link className="pp-gold" href="/property-portal/listings">Browse all listings</Link>.
        </p>
      </main>
    );
  }

  // The main image is often a still from the site-visit clip, which made the
  // hero and the video below it the same frame. When that happens, and there
  // is other artwork, the hero takes the first gallery image instead.
  const galleryPaths = (dev.gallery || []).filter(Boolean);
  const heroIsVideoStill =
    !!dev.featured_image && !!dev.video_poster_url && dev.featured_image === dev.video_poster_url;
  const hero =
    (heroIsVideoStill && galleryPaths.length ? resolveImage(galleryPaths[0]) : null) ||
    resolveImage(dev.featured_image) ||
    resolveImage(galleryPaths[0]);
  // Video, poster and brochure all live in the same bucket as the images.
  const video = resolveImage(dev.video_url);
  const videoPoster = resolveImage(dev.video_poster_url) || hero;
  const brochure = resolveImage(dev.brochure_url);
  // numeric columns come back as strings over the wire.
  const lat = Number(dev.latitude);
  const lon = Number(dev.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
  const gallery = galleryPaths.map(resolveImage).filter(Boolean).filter((src) => src !== hero);
  const saveId = `dev:${dev.id}`;
  const display = prefCcy || '';
  // Typed by hand in admin, so capitalise for display rather than trusting it.
  const titleCase = (value) =>
    String(value)
      .split(' ')
      .map((word) => (word.length > 2 ? word[0].toUpperCase() + word.slice(1) : word))
      .join(' ');
  const locationLine = [dev.area, dev.city, dev.province_state, dev.country]
    .filter(Boolean)
    .map(titleCase)
    .join(', ');

  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / <Link href="/property-portal/off-plan">Developments</Link> / <span>{dev.name}</span>
        </div>
      </div>

      <section className="pp-dev-hero">
        {hero && (
          <button type="button" className="pp-dev-hero-img" onClick={() => gallery.length && setLightbox(0)} aria-label="View gallery">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt={dev.name} />
          </button>
        )}
        <div className="pp-dev-hero-body">
          <div className="pp-dev-badges">
            {dev.development_status && <span className="pp-dev-badge">{DEVELOPMENT_STATUS_LABEL[dev.development_status] || dev.development_status}</span>}
            {dev.verified && <span className="pp-dev-badge pp-dev-badge--gold">Verified</span>}
            {dev.approval_status && <span className="pp-dev-badge">{dev.approval_status}</span>}
          </div>
          <h1 className="pp-detail-title">{dev.name}</h1>
          <p className="pp-detail-loc">{locationLine}</p>
          {(dev.developer_name || dev.marketing_agent) && (
            <p className="pp-dev-brands">
              {dev.developer_name && <>Developed by <strong>{dev.developer_name}</strong></>}
              {dev.developer_name && dev.marketing_agent && ' · '}
              {dev.marketing_agent && <>Marketed by <strong>{dev.marketing_agent}</strong></>}
            </p>
          )}
          {fromPrice && (
            <p className="pp-dev-from">
              From
              <strong>{displayPrice(fromPrice.total_price, fromPrice.currency, display)}</strong>
              <span>
                {available.length || units.length} plot size
                {(available.length || units.length) === 1 ? '' : 's'}
                {units.some((u) => u.payment_plan) ? ' · instalment plans available' : ''}
              </span>
            </p>
          )}
          <div className="pp-dev-actions">
            <button type="button" className="pp-dev-cta" onClick={() => enquireAbout(null)}>Make an Enquiry</button>
            <button type="button" className="pp-dev-ghost" onClick={() => { setInterest(`${dev.name} — site visit`); enquireAbout(null); }}>
              Book a Site Visit
            </button>
            {wlReady && (
              <button type="button" className="pp-dev-ghost" onClick={() => toggle(saveId)} aria-pressed={has(saveId)}>
                {has(saveId) ? '♥ Saved' : '♡ Save'}
              </button>
            )}
            <button type="button" className="pp-dev-ghost" onClick={share}>{copied ? 'Link copied' : 'Share'}</button>
            {brochure && (
              <a className="pp-dev-ghost" href={brochure} download={dev.brochure_name || undefined} target="_blank" rel="noopener noreferrer">
                ↓ Brochure
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="pp-container">
        <div className="pp-dev-tabs" role="tablist" aria-label="Development sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? 'active' : undefined}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <section className="pp-detail-section">
            <h2 className="pp-h2">Overview</h2>

            {/* No placeholder line when there is no description — an empty
                section is better than "Details available on request." sitting
                where the copy should be. */}
            {dev.description && <p className="pp-detail-desc">{dev.description}</p>}

            <div className="pp-dev-facts">
              <div className="pp-dev-fact">
                <small>Plot sizes</small>
                <span>{units.length || '—'}</span>
              </div>
              {fromPrice && (
                <div className="pp-dev-fact">
                  <small>From</small>
                  <span>{displayPrice(fromPrice.total_price, fromPrice.currency, display)}</span>
                </div>
              )}
              {dev.development_status && (
                <div className="pp-dev-fact">
                  <small>Status</small>
                  <span>{DEVELOPMENT_STATUS_LABEL[dev.development_status] || dev.development_status}</span>
                </div>
              )}
              {dev.possession_status && (
                <div className="pp-dev-fact">
                  <small>Possession</small>
                  <span>{POSSESSION_LABEL[dev.possession_status] || dev.possession_status}</span>
                </div>
              )}
              {dev.developer_name && (
                <div className="pp-dev-fact">
                  <small>Developer</small>
                  <span>{dev.developer_name}</span>
                </div>
              )}
              {dev.approval_authority && (
                <div className="pp-dev-fact">
                  <small>Approved by</small>
                  <span>{dev.approval_authority}</span>
                </div>
              )}
            </div>
            {video && (
              <div className="pp-dev-block">
                <h3 className="pp-dev-block-title">Site visit</h3>
                <div className="pp-dev-video">
                  <video
                    src={video}
                    poster={videoPoster || undefined}
                    controls
                    playsInline
                    preload="metadata"
                  />
                </div>
              </div>
            )}

            {gallery.length > 0 && (
              <div className="pp-dev-block">
                <h3 className="pp-dev-block-title">
                  {gallery.length} photo{gallery.length === 1 ? '' : 's'}
                </h3>
                <div className="pp-dev-gallery">
                  {gallery.map((src, i) => (
                    <button key={src} type="button" onClick={() => setLightbox(i)} aria-label={`Open image ${i + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`${dev.name} ${i + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Features belong in the overview too when there are only a few —
                a whole tab for four bullet points reads as an empty page. */}
            {(dev.features || []).length > 0 && (
              <div className="pp-dev-block">
                <h3 className="pp-dev-block-title">Highlights</h3>
                <div className="pp-features">
                  {dev.features.map((feature) => (
                    <span key={feature} className="pp-feature">{feature}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'plots' && (
          <section className="pp-detail-section">
            <h2 className="pp-h2">Available Plots</h2>
            {units.length === 0 ? (
              <p className="pp-detail-desc">Plot sizes for this development are being finalised — get in touch for the current release.</p>
            ) : (
              <div className="pp-variants">
                {units.map((u) => {
                  const flags = PLOT_POSITION_FLAGS.filter((f) => u[f.key]);
                  return (
                    <article key={u.id} className="pp-variant">
                      <div className="pp-variant-head">
                        <div>
                          <h3>{u.title}</h3>
                          <p className="pp-variant-size">
                            {formatPlotSize(u.plot_size, u.plot_size_unit) || '—'}
                            {u.plot_category ? ` · ${PLOT_CATEGORY_LABEL[u.plot_category] || u.plot_category}` : ''}
                          </p>
                        </div>
                        <span className={`pp-variant-status pp-variant-status--${u.availability_status}`}>
                          {AVAILABILITY_LABEL[u.availability_status] || u.availability_status}
                        </span>
                      </div>

                      <p className="pp-variant-price">{displayPrice(u.total_price, u.currency, display)}</p>

                      {(u.block || u.sector || u.plot_number || u.possession_status || flags.length > 0) && (
                        <ul className="pp-variant-meta">
                          {u.block && <li>Block {u.block}</li>}
                          {u.sector && <li>Sector {u.sector}</li>}
                          {u.plot_number && <li>Plot {u.plot_number}</li>}
                          {u.possession_status && <li>{POSSESSION_LABEL[u.possession_status] || u.possession_status}</li>}
                          {flags.map((f) => <li key={f.key}>{f.label}</li>)}
                        </ul>
                      )}

                      <div className="pp-variant-actions">
                        {u.payment_plan && (
                          <button type="button" className="pp-dev-ghost" onClick={() => setOpenPlan(openPlan === u.id ? null : u.id)}>
                            {openPlan === u.id ? 'Hide Payment Plan' : 'View Payment Plan'}
                          </button>
                        )}
                        <button type="button" className="pp-dev-cta" onClick={() => enquireAbout(u)}>Enquire</button>
                      </div>

                      {openPlan === u.id && u.payment_plan && (
                        <PaymentPlanTable plan={u.payment_plan} currency={u.currency} display={display} />
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'plan' && (
          <section className="pp-detail-section">
            <h2 className="pp-h2">Payment Plan</h2>
            {units.filter((u) => u.payment_plan).length === 0 ? (
              <p className="pp-detail-desc">Payment plans for this development are available on request.</p>
            ) : (
              units
                .filter((u) => u.payment_plan)
                .map((u) => (
                  <div key={u.id} className="pp-plan-block">
                    <h3 className="pp-plan-title">
                      {u.title}
                      <span> · {displayPrice(u.total_price, u.currency, display)}</span>
                    </h3>
                    <PaymentPlanTable plan={u.payment_plan} currency={u.currency} display={display} />
                    <button type="button" className="pp-dev-cta" onClick={() => enquireAbout(u)}>Enquire About {u.title}</button>
                  </div>
                ))
            )}
            <p className="pp-plan-note">
              Figures are the developer&rsquo;s advertised schedule. They are indicative and subject to the
              developer&rsquo;s terms at the time of booking.
            </p>
          </section>
        )}

        {tab === 'features' && (
          <section className="pp-detail-section">
            <h2 className="pp-h2">Features</h2>
            {(dev.features || []).length === 0 ? (
              <p className="pp-detail-desc">Feature list available on request.</p>
            ) : (
              <div className="pp-features">
                {dev.features.map((f) => <span key={f} className="pp-feature">{f}</span>)}
              </div>
            )}
          </section>
        )}

        {tab === 'location' && (
          <section className="pp-detail-section">
            <h2 className="pp-h2">Location</h2>
            <p className="pp-detail-desc">{dev.address || locationLine}</p>
            {hasCoords ? (
              <>
                {/* OpenStreetMap's embed needs no API key, so the map works
                    without adding a billed Google Maps account. The link out
                    still goes to Google, which is what people navigate with. */}
                <div className="pp-dev-map">
                  <iframe
                    title={`Map of ${dev.name}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.012}%2C${lon + 0.02}%2C${lat + 0.012}&layer=mapnik&marker=${lat}%2C${lon}`}
                  />
                </div>
                <p style={{ marginTop: 14 }}>
                  <a
                    className="pp-link-arrow"
                    href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Maps →
                  </a>
                </p>
              </>
            ) : (
              <>
                <p className="pp-detail-desc">
                  Precise coordinates for this development have not been published yet.
                </p>
                <p>
                  <a
                    className="pp-link-arrow"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      [dev.name, dev.area, dev.city, dev.country].filter(Boolean).join(', ')
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Search for it on Google Maps →
                  </a>
                </p>
              </>
            )}
          </section>
        )}

        {tab === 'developer' && (
          <section className="pp-detail-section">
            <h2 className="pp-h2">Developer</h2>
            <div className="pp-spec-grid">
              {dev.developer_name && <div className="pp-spec"><small>Developer</small><span>{dev.developer_name}</span></div>}
              {dev.marketing_agent && <div className="pp-spec"><small>Marketing</small><span>{dev.marketing_agent}</span></div>}
              {dev.approval_authority && <div className="pp-spec"><small>Approval authority</small><span>{dev.approval_authority}</span></div>}
              {dev.approval_status && <div className="pp-spec"><small>Approval status</small><span>{dev.approval_status}</span></div>}
            </div>
            <p className="pp-plan-note">
              CZAAH introduces and supports the transaction. Development, construction and delivery remain the
              developer&rsquo;s responsibility.
            </p>
          </section>
        )}

        {tab === 'contact' && (
          <section className="pp-detail-section" id="pp-dev-contact">
            <h2 className="pp-h2">Contact</h2>
            {sent ? (
              <p className="pp-detail-desc">
                Thank you — your enquiry about <strong>{interest || dev.name}</strong> is with the desk. We will be in touch shortly.
              </p>
            ) : (
              <form className="pp-dev-form" onSubmit={submitEnquiry}>
                {interest && <p className="pp-dev-interest">Enquiring about: <strong>{interest}</strong></p>}
                <div className="pp-dev-form-row">
                  <label>
                    <span>Name</span>
                    <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
                  </label>
                  <label>
                    <span>Email</span>
                    <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
                  </label>
                </div>
                <label>
                  <span>Phone</span>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Include country code" />
                </label>
                <label>
                  <span>Message</span>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Plot size, budget, timescale…"
                  />
                </label>
                <button type="submit" className="pp-dev-cta" disabled={sending}>
                  {sending ? 'Sending…' : 'Send Enquiry'}
                </button>
                {sendError && <p className="pp-sell-err">{sendError}</p>}
              </form>
            )}
          </section>
        )}
      </div>

      {lightbox >= 0 && gallery.length > 0 && (
        <Lightbox images={gallery} index={lightbox} alt={dev.name} onClose={() => setLightbox(-1)} onIndex={setLightbox} />
      )}
    </main>
  );
}
