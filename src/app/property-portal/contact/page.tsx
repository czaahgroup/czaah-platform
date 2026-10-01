'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { portalOffices, portalEmail, portalPhone, portalWhatsApp } from '../_components/portalRuntime';
import { track } from '../_components/analytics';

// Kept free of market names: the list must not need editing when a market is added.
const INTERESTS = [
  'Buying a property',
  'Renting a property',
  'Off-plan and new developments',
  'Property investment',
  'Selling or letting a property',
  'Book a consultation',
  'Something else',
];

export default function PortalContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    interest: '',
    message: '',
    company_site: '',
  });
  const [reference, setReference] = useState<string | null>(null);
  const phone = portalPhone();
  const whatsapp = portalWhatsApp();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  // Read from the address bar rather than useSearchParams, so the page keeps
  // rendering on the server.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^[\w .,&'()—-]{2,120}$/.test(ref)) {
      setForm((f) => (f.message ? f : { ...f, message: `Regarding ${ref}: ` }));
    }
  }, []);

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      // Stored as an advisor_request lead (Admin → Property Leads), linked to
      // the CRM contact, like every other portal enquiry.
      const res = await fetch('/api/property-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'advisor_request',
          name: form.name,
          email: form.email,
          phone: form.phone,
          purpose: form.interest,
          message: form.message,
          source_page: window.location.pathname,
          company_site: form.company_site,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setReference(json.reference || null);
        track('advisor_request');
        setStatus('sent');
      } else {
        setStatus('error');
        setError(json?.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / Contact
        </div>

        <div className="pp-listpage-head">
          <h1>
            Speak to an <span className="pp-gold">advisor</span>
          </h1>
        </div>

        <p className="pp-section-lead" style={{ maxWidth: 720 }}>
          Tell us what you are looking for and a CZAAH Properties advisor will come back to you.
          Looking for something specific?{' '}
          <Link href="/property-portal/find-a-property" className="pp-gold">Request a property shortlist</Link>.
        </p>
      </div>

      <section className="pp-section">
        <div className="pp-container">
          <div className="pp-intro" style={{ alignItems: 'flex-start' }}>
            <div className="pp-enquire-card" id="contact-form">
              {status === 'sent' ? (
                <div className="pp-sell-sent">
                  <div className="pp-sell-sent-mark">✓</div>
                  <h3>Thank you — we&apos;ve got it.</h3>
                  <p>
                    A CZAAH Properties advisor will be in touch{reference ? ` (reference ${reference})` : ''}. For anything
                    urgent, email{' '}
                    <a href={`mailto:${portalEmail()}`} className="pp-gold">{portalEmail()}</a>.
                  </p>
                  <Link href="/property-portal/listings" className="pp-btn pp-btn--ghost">
                    Browse listings
                  </Link>
                </div>
              ) : (
                <form onSubmit={submit} className="pp-sell-form">
                  <div aria-hidden="true" className="pp-hp">
                    <label>Company website<input tabIndex={-1} autoComplete="off" value={form.company_site} onChange={(e) => update('company_site', e.target.value)} /></label>
                  </div>
                  <label>
                    Name
                    <input
                      required
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Your full name"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="you@company.com"
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="Include country code"
                    />
                  </label>
                  <label>
                    I&apos;m interested in
                    <select value={form.interest} onChange={(e) => update('interest', e.target.value)}>
                      <option value="">Select one…</option>
                      {INTERESTS.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Message
                    <textarea
                      rows={5}
                      value={form.message}
                      onChange={(e) => update('message', e.target.value)}
                      placeholder="Budget, market, asset class, timescale…"
                    />
                  </label>
                  {status === 'error' && <p className="pp-sell-err">{error}</p>}
                  <button type="submit" className="pp-btn pp-btn--gold" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Speak to an Advisor'}
                  </button>
                  <p className="pp-enquire-note">
                    We&apos;ll only use your details to respond to this enquiry.
                  </p>
                </form>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h2 className="pp-h2" style={{ marginBottom: 10 }}>Our offices</h2>
              <p className="pp-section-lead" style={{ marginBottom: 26 }}>
                Email reaches the team fastest:{' '}
                <a href={`mailto:${portalEmail()}`} className="pp-gold">{portalEmail()}</a>
              </p>
              {/* Shown only when CZAAH's own numbers are set in Portal Content → Offices. */}
              {(phone || whatsapp) && (
                <div className="pp-contact-btns" style={{ marginBottom: 26, maxWidth: 360 }}>
                  {phone && <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="pp-btn pp-btn--ghost" onClick={() => track('phone_click', { via: 'contact' })}>Call</a>}
                  {whatsapp && (
                    <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="pp-btn pp-btn--ghost pp-btn-whatsapp" onClick={() => track('whatsapp_click', { via: 'contact' })}>
                      Chat on WhatsApp
                    </a>
                  )}
                </div>
              )}
              <div className="pp-office-list">
                {portalOffices().map((o) => (
                  <div className="pp-presence" key={o.city}>
                    <strong>{o.city}</strong>
                    {o.lines.map((l) => (
                      <span key={l}>{l}</span>
                    ))}
                    <small>{o.role}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
