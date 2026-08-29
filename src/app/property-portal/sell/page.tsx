'use client';
// @ts-nocheck

import { useState } from 'react';
import Link from 'next/link';


const POINTS = [
  {
    t: 'Expertise that closes',
    d: 'CZAAH runs cross-border transactions for a living. We know how title, tax and transfer work in each of our markets — and how to get a sale over the line without surprises.',
  },
  {
    t: 'A qualified buyer network',
    d: 'Your property is put in front of CZAAH’s existing investor base and partner desks in London, Dubai and Pakistan — serious buyers, not a public listings feed.',
  },
  {
    t: 'Positioning, not just advertising',
    d: 'We price and present each asset on the numbers investors care about — yield, area, tenure and comparables — so it reaches the right audience the first time.',
  },
  {
    t: 'One point of contact',
    d: 'From valuation through negotiation to completion, a single CZAAH counterparty handles the process. You deal with us, not a chain of agents.',
  },
];

const TYPES = [
  'Residential',
  'Commercial',
  'Industrial',
  'Mixed Use',
  'Land',
  'Other',
];

export default function SellPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    type: '',
    price: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');

    const message = [
      `Property for sale enquiry submitted via the CZAAH Property portal.`,
      ``,
      `Location / city: ${form.location || '—'}`,
      `Property type: ${form.type || '—'}`,
      `Guide / asking price: ${form.price || '—'}`,
      ``,
      `Details from the owner:`,
      form.message || '—',
    ].join('\n');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          interest: `Sell a Property${form.location ? ` — ${form.location}` : ''}`,
          message,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus('sent');
      } else {
        setStatus('error');
        setError(json.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <main>
      {/* HERO */}
      <section className="pp-hero">
        <div className="pp-container">
          <div className="pp-eyebrow">CZAAH Property · Sellers</div>
          <h1>
            Sell your property <span className="pp-gold">with confidence.</span>
          </h1>
          <p className="pp-hero-lede">
            List with CZAAH and reach an international base of vetted buyers across London, Dubai
            and Pakistan — with valuation, positioning and negotiation handled end-to-end by a
            single counterparty.
          </p>
          <a href="#sell-form" className="pp-btn pp-btn--gold">List Your Property</a>
        </div>
      </section>

      {/* WHY + FORM */}
      <section className="pp-section">
        <div className="pp-container">
          <div className="pp-intro" style={{ alignItems: 'start' }}>
            <div>
              <div className="pp-eyebrow">What We Offer</div>
              <h2 className="pp-h2">Why sell through CZAAH?</h2>
              <div className="pp-sell-points">
                {POINTS.map((p) => (
                  <div className="pp-sell-point" key={p.t}>
                    <h3>{p.t}</h3>
                    <p>{p.d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pp-enquire-card" id="sell-form" style={{ position: 'sticky', top: 100 }}>
              {status === 'sent' ? (
                <div className="pp-sell-sent">
                  <div className="pp-sell-sent-mark">✓</div>
                  <h3>Thank you — we&apos;ve got it.</h3>
                  <p>
                    A member of the CZAAH Property team will be in touch within one business day to
                    discuss valuation and next steps. A confirmation has been sent to your email.
                  </p>
                  <Link href="/property-portal/listings" className="pp-btn pp-btn--ghost">
                    Browse Listings
                  </Link>
                </div>
              ) : (
                <form onSubmit={submit} className="pp-sell-form">
                  <h3>Tell us about your property</h3>
                  <label>
                    <span>Full name *</span>
                    <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
                  </label>
                  <label>
                    <span>Email *</span>
                    <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                  </label>
                  <label>
                    <span>Property location / city *</span>
                    <input required value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="e.g. Business Bay, Dubai" />
                  </label>
                  <label>
                    <span>Property type</span>
                    <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                      <option value="">Select…</option>
                      {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Guide / asking price</span>
                    <input value={form.price} onChange={(e) => update('price', e.target.value)} placeholder="e.g. USD 950,000" />
                  </label>
                  <label>
                    <span>Anything else we should know?</span>
                    <textarea rows={4} value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="Size, tenure, tenancy, timing…" />
                  </label>
                  {status === 'error' && <p className="pp-sell-err">{error}</p>}
                  <button type="submit" className="pp-btn pp-btn--gold" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Submit Property'}
                  </button>
                  <p className="pp-enquire-note">
                    Submitting sends your details to the CZAAH Property team. No obligation.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pp-cta-band">
        <div className="pp-container">
          <h2 className="pp-h2">Prefer to talk it through first?</h2>
          <p>Book a call with the CZAAH Property team and we&apos;ll walk you through valuation, timing and the sale process.</p>
          <div className="pp-cta-actions">
            <Link href="/contact?interest=Sell%20a%20Property#contact-form" className="pp-btn pp-btn--gold">
              Book a Call
            </Link>
            <Link href="/property-portal/listings" className="pp-btn pp-btn--ghost">
              Browse Listings
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
