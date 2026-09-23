'use client';

import { useState } from 'react';
import { portalLocations } from './portalRuntime';
import { track } from './analytics';
import { Button } from './ui';
import { CURRENCIES } from './types';
import { SUBMISSION_PROPERTY_TYPES, TIMELINES } from '@/lib/propertySubmissions';

// Investment enquiry (brief §8). Goes to the enquiries inbox through
// /api/contact, like the listing enquiry form — no account needed.

export const PURPOSES = ['Rental income', 'Long-term hold', 'Own use / second home', 'Business premises', 'Not sure yet'];
export const FUNDING = ['Cash', 'Mortgage / finance', 'Not decided'];

export interface InvestmentForm {
  name: string;
  email: string;
  phone: string;
  currency: string;
  budget: string;
  country: string;
  city: string;
  property_type: string;
  funding: string;
  purpose: string;
  timeline: string;
  message: string;
}

const EMPTY: InvestmentForm = {
  name: '', email: '', phone: '', currency: 'GBP', budget: '', country: '', city: '',
  property_type: '', funding: '', purpose: '', timeline: '', message: '',
};

/** The /api/contact payload for an investment enquiry. */
export function buildInvestmentEnquiry(f: InvestmentForm) {
  const amount = Number(f.budget);
  const budget = f.budget.trim() && Number.isFinite(amount) && amount > 0
    ? `${f.currency} ${Math.round(amount).toLocaleString('en-GB')}`
    : 'not stated';
  const type = SUBMISSION_PROPERTY_TYPES.find((t) => t.v === f.property_type)?.l || f.property_type || 'any';
  const where = [f.city.trim(), f.country].filter(Boolean).join(', ') || 'open to suggestions';
  const lines = [
    f.message.trim() || 'I would like to discuss investing in property.',
    '',
    `Budget: ${budget}`,
    `Preferred location: ${where}`,
    `Property type: ${type}`,
    `Funding: ${f.funding || 'not stated'}`,
    `Purpose: ${f.purpose || 'not stated'}`,
    `Timeline: ${f.timeline || 'not stated'}`,
  ];
  return {
    name: f.name.trim(),
    email: f.email.trim(),
    phone: f.phone.trim() || undefined,
    interest: `Investment enquiry — ${f.country || 'any market'}`,
    message: lines.join('\n'),
    source: 'contact_form',
  };
}

export function InvestmentEnquiry() {
  const countries = (portalLocations() || []).flatMap((r) => r.countries);
  const [form, setForm] = useState<InvestmentForm>(EMPTY);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const set = (k: keyof InvestmentForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const cities = countries.find((c) => c.name === form.country)?.cities || [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildInvestmentEnquiry(form)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      track('investment_enquiry', { country: form.country || 'any' });
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="pp-sell-sent" role="status">
        <div className="pp-sell-sent-mark">✓</div>
        <h3>Thank you — your enquiry is with us.</h3>
        <p>
          A member of the CZAAH Properties team will be in touch to talk through what you&apos;re
          looking for. A confirmation is on its way to your email.
        </p>
        <button type="button" className="pp-link-btn" onClick={() => { setForm(EMPTY); setState('idle'); }}>
          Send another enquiry
        </button>
      </div>
    );
  }

  const select = (k: keyof InvestmentForm, label: string, options: { v: string; l: string }[], required = false) => (
    <label>
      <span>{label}{required && ' *'}</span>
      <select required={required} value={form[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="">Choose…</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
  const plain = (list: string[]) => list.map((v) => ({ v, l: v }));

  return (
    <form className="pp-sell-form" onSubmit={submit}>
      <h3>Investment enquiry</h3>
      <fieldset>
        <legend>Your details</legend>
        <label><span>Full name *</span><input required maxLength={200} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <div className="pp-sell-row">
          <label><span>Email *</span><input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
          <label><span>Phone</span><input type="tel" maxLength={50} autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>What you&apos;re looking for</legend>
        <div className="pp-sell-row">
          <label>
            <span>Currency</span>
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label><span>Budget (approx.)</span><input type="number" min={0} step="any" inputMode="numeric" value={form.budget} onChange={(e) => set('budget', e.target.value)} /></label>
        </div>
        <div className="pp-sell-row">
          <label>
            <span>Preferred country</span>
            <select value={form.country} onChange={(e) => {
              const c = countries.find((x) => x.name === e.target.value);
              // Budget currency follows the market, unless it isn't one we list.
              setForm((f) => ({ ...f, country: e.target.value, city: '', currency: c && (CURRENCIES as readonly string[]).includes(c.currency) ? c.currency : f.currency }));
            }}>
              <option value="">Any market</option>
              {countries.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          {cities.length > 0 ? (
            <label>
              <span>Preferred city</span>
              <select value={form.city} onChange={(e) => set('city', e.target.value)}>
                <option value="">Any city</option>
                {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          ) : (
            <label><span>Preferred city</span><input maxLength={100} value={form.city} onChange={(e) => set('city', e.target.value)} /></label>
          )}
        </div>
        {select('property_type', 'Property type', SUBMISSION_PROPERTY_TYPES.filter((t) => t.v !== 'room').map((t) => ({ v: t.v, l: t.l })))}
        <div className="pp-sell-row">
          {select('funding', 'Cash or finance', plain(FUNDING))}
          {select('purpose', 'Purpose', plain(PURPOSES))}
        </div>
        {select('timeline', 'When are you looking to buy?', plain(TIMELINES))}
        <label>
          <span>Anything else</span>
          <textarea rows={3} maxLength={3000} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="Areas you like, questions about a market, how you'd like to be contacted…" />
        </label>
      </fieldset>
      {state === 'error' && <p className="pp-sell-err" role="alert">{error}</p>}
      <Button type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send enquiry'}</Button>
      <p className="pp-enquire-note">No account needed. Your details go to the CZAAH Properties team only.</p>
    </form>
  );
}
