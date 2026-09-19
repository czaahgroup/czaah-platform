'use client';
// @ts-nocheck

import { useState } from 'react';
import Link from 'next/link';
import { OFFICES, PORTAL_EMAIL } from '../_components/offices';

const INTERESTS = [
  'Buying — London',
  'Buying — Dubai',
  'Buying — Pakistan',
  'Off-plan investment',
  'Selling a property',
  'General enquiry',
];

export default function PortalContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    interest: '',
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
    try {
      // Same endpoint the main site and the sell page use, tagged so the desk
      // can tell portal enquiries apart from group ones.
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          interest: `Property Portal${form.interest ? ` — ${form.interest}` : ''}`,
          message: form.message,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
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
            Contact the <span className="pp-gold">property desk</span>
          </h1>
        </div>

        <p className="pp-section-lead" style={{ maxWidth: 720 }}>
          Tell us what you&apos;re looking for and we&apos;ll come back with what fits — including
          opportunities not yet published on the portal.
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
                    A member of the CZAAH property desk will be in touch shortly. For anything
                    urgent, email{' '}
                    <a href={`mailto:${PORTAL_EMAIL}`} className="pp-gold">{PORTAL_EMAIL}</a>.
                  </p>
                  <Link href="/property-portal/listings" className="pp-btn pp-btn--ghost">
                    Browse listings
                  </Link>
                </div>
              ) : (
                <form onSubmit={submit} className="pp-sell-form">
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
                    {status === 'sending' ? 'Sending…' : 'Send enquiry'}
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
                Email reaches the property desk fastest:{' '}
                <a href={`mailto:${PORTAL_EMAIL}`} className="pp-gold">{PORTAL_EMAIL}</a>
              </p>
              <div className="pp-office-list">
                {OFFICES.map((o) => (
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
