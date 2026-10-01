'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { portalLocations } from './portalRuntime';
import { CURRENCIES } from './types';
import { track } from './analytics';
import { Button } from './ui';
import { SOURCING_GOALS, SOURCING_TIMELINES, CONTACT_METHODS } from '@/lib/propertyLeads';

// "Find a property for me": a short guided request. It is stored as a
// property_sourcing_request lead (Admin → Property Leads) through the same
// endpoint as every other portal enquiry — no new backend.

const TYPES = ['Apartment', 'House or villa', 'Office', 'Retail', 'Industrial', 'Land or plot', 'Not sure yet'];
const BEDROOMS = ['Studio', '1', '2', '3', '4', '5+'];
const STEPS = ['Looking for', 'Location', 'Budget', 'Requirements', 'Timeline', 'Your details'] as const;
const OTHER = 'Somewhere else';

type Goal = (typeof SOURCING_GOALS)[number];

const GOAL_HINT: Record<Goal, string> = {
  Buy: 'A home or a property to own',
  Rent: 'A home or space to let',
  Investment: 'Property held for income or growth',
  Commercial: 'Offices, retail, industrial',
  'Off-plan': 'New developments before completion',
};

export function SourcingForm() {
  const params = useSearchParams();
  const tree = portalLocations() || [];
  const countries = useMemo(() => tree.flatMap((r) => r.countries), [tree]);

  const startGoal = SOURCING_GOALS.find((g) => g.toLowerCase() === (params.get('goal') || '').toLowerCase()) || '';
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    goal: startGoal as Goal | '',
    country: params.get('country') || '',
    city: params.get('city') || '',
    area: '',
    open: false,
    budget: '',
    currency: 'USD',
    type: '',
    bedrooms: '',
    size: '',
    other: '',
    timeline: '',
    name: '',
    email: '',
    phone: '',
    method: 'Email',
    company_site: '',
  });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const started = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    if (!started.current) { started.current = true; track('property_sourcing_started'); }
    setForm((f) => ({ ...f, [k]: v }));
    setError('');
  };

  // Moving between steps puts focus on the new step's heading, so a keyboard
  // or screen-reader user lands at the question rather than the buttons.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus();
  }, [step, state]);

  const cities = countries.find((c) => c.name === form.country)?.cities || [];

  function problem(at: number): string {
    if (at === 0 && !form.goal) return 'Choose what you are looking for.';
    if (at === 1 && !form.country && !form.open) return 'Choose a country, or tell us you are open to recommendations.';
    if (at === 2 && form.budget && !(Number(form.budget) > 0)) return 'Enter the budget as a number, or leave it blank.';
    if (at === 5 && !form.name.trim()) return 'Please enter your name.';
    if (at === 5 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please enter a valid email address.';
    return '';
  }

  function next() {
    const p = problem(step);
    if (p) { setError(p); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) { next(); return; }
    const p = problem(step);
    if (p) { setError(p); return; }
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/property-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'property_sourcing_request',
          purpose: form.goal,
          country: form.country && form.country !== OTHER ? form.country : undefined,
          city: form.city,
          area: form.area,
          open_to_recommendations: form.open,
          budget_amount: form.budget || undefined,
          budget_currency: form.currency,
          property_type: form.type,
          bedrooms: form.bedrooms,
          size: form.size,
          message: form.other,
          timeline: form.timeline,
          name: form.name,
          email: form.email,
          phone: form.phone,
          contact_method: form.method,
          source_page: window.location.pathname,
          company_site: form.company_site,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      setReference(json.reference || null);
      track('property_sourcing_submitted');
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="pp-wizard pp-wizard--done" role="status">
        <div className="pp-wizard-tick" aria-hidden="true">✓</div>
        <h2 ref={heading} tabIndex={-1}>Requirements received</h2>
        <p>
          Thank you. A CZAAH Properties advisor will review what you have told us and come back to
          you{reference ? <> — your reference is <strong>{reference}</strong></> : null}.
        </p>
        <div className="pp-wizard-actions">
          <Link href="/property-portal/listings" className="pp-btn pp-btn--ghost">Browse properties</Link>
        </div>
      </div>
    );
  }

  const last = step === STEPS.length - 1;

  return (
    <form className="pp-wizard" onSubmit={submit} noValidate>
      <div className="pp-wizard-progress" aria-hidden="true">
        {STEPS.map((s, i) => <span key={s} className={i <= step ? 'is-done' : undefined} />)}
      </div>
      <p className="pp-wizard-count">Step {step + 1} of {STEPS.length}</p>

      <div aria-hidden="true" className="pp-hp">
        <label>Company website<input tabIndex={-1} autoComplete="off" value={form.company_site} onChange={(e) => setForm((f) => ({ ...f, company_site: e.target.value }))} /></label>
      </div>

      {step === 0 && (
        <fieldset>
          <legend><h2 ref={heading} tabIndex={-1}>What are you looking for?</h2></legend>
          <div className="pp-choice-grid">
            {SOURCING_GOALS.map((g) => (
              <label key={g} className={`pp-choice${form.goal === g ? ' is-on' : ''}`}>
                <input type="radio" name="goal" checked={form.goal === g} onChange={() => set('goal', g)} />
                <strong>{g}</strong>
                <span>{GOAL_HINT[g]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset>
          <legend><h2 ref={heading} tabIndex={-1}>Where would you like it to be?</h2></legend>
          <div className="pp-wizard-fields">
            <label>
              <span>Country</span>
              <select value={form.country} onChange={(e) => { set('country', e.target.value); setForm((f) => ({ ...f, city: '' })); }}>
                <option value="">Select a country</option>
                {countries.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value={OTHER}>{OTHER}</option>
              </select>
            </label>
            <label>
              <span>City</span>
              {cities.length > 0 ? (
                <select value={form.city} onChange={(e) => set('city', e.target.value)}>
                  <option value="">Any city</option>
                  {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input value={form.city} maxLength={100} onChange={(e) => set('city', e.target.value)} placeholder="Optional" />
              )}
            </label>
            <label className="is-wide">
              <span>Area or neighbourhood</span>
              <input value={form.area} maxLength={120} onChange={(e) => set('area', e.target.value)} placeholder="Optional" />
            </label>
          </div>
          <label className="pp-check">
            <input type="checkbox" checked={form.open} onChange={(e) => set('open', e.target.checked)} />
            <span>I am open to recommendations</span>
          </label>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset>
          <legend><h2 ref={heading} tabIndex={-1}>What is your budget?</h2></legend>
          <p className="pp-wizard-help">
            {form.goal === 'Rent' ? 'Monthly rent you have in mind. ' : ''}An approximate figure is fine, and you can leave it blank.
          </p>
          <div className="pp-wizard-fields">
            <label>
              <span>Amount</span>
              <input inputMode="numeric" value={form.budget} maxLength={14} onChange={(e) => set('budget', e.target.value.replace(/[^\d]/g, ''))} placeholder="e.g. 500000" />
            </label>
            <label>
              <span>Currency</span>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </fieldset>
      )}

      {step === 3 && (
        <fieldset>
          <legend><h2 ref={heading} tabIndex={-1}>What should the property have?</h2></legend>
          <div className="pp-wizard-fields">
            <label>
              <span>Property type</span>
              <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="">Any type</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>
              <span>Bedrooms</span>
              <select value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)}>
                <option value="">Any / not applicable</option>
                {BEDROOMS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="is-wide">
              <span>Size</span>
              <input value={form.size} maxLength={60} onChange={(e) => set('size', e.target.value)} placeholder="e.g. 1,200 ft² or 10 marla (optional)" />
            </label>
            <label className="is-wide">
              <span>Anything else we should know</span>
              <textarea rows={3} maxLength={2000} value={form.other} onChange={(e) => set('other', e.target.value)} placeholder="Must-haves, things to avoid, how you plan to fund the purchase…" />
            </label>
          </div>
        </fieldset>
      )}

      {step === 4 && (
        <fieldset>
          <legend><h2 ref={heading} tabIndex={-1}>When are you looking to move forward?</h2></legend>
          <div className="pp-choice-grid pp-choice-grid--list">
            {SOURCING_TIMELINES.map((t) => (
              <label key={t} className={`pp-choice${form.timeline === t ? ' is-on' : ''}`}>
                <input type="radio" name="timeline" checked={form.timeline === t} onChange={() => set('timeline', t)} />
                <strong>{t}</strong>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {step === 5 && (
        <fieldset>
          <legend><h2 ref={heading} tabIndex={-1}>How can we reach you?</h2></legend>
          <div className="pp-wizard-fields">
            <label>
              <span>Name *</span>
              <input required maxLength={200} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label>
              <span>Email *</span>
              <input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </label>
            <label>
              <span>Phone</span>
              <input type="tel" maxLength={50} autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Include country code" />
            </label>
            <label>
              <span>Preferred contact method</span>
              <select value={form.method} onChange={(e) => set('method', e.target.value)}>
                {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <p className="pp-wizard-help">Your details go to the CZAAH Properties team only, and are used to respond to this request.</p>
        </fieldset>
      )}

      {error && <p className="pp-sell-err" role="alert">{error}</p>}

      <div className="pp-wizard-actions">
        {step > 0 && (
          <Button variant="ghost" onClick={() => { setError(''); setStep((s) => s - 1); }} disabled={state === 'sending'}>Back</Button>
        )}
        <Button type="submit" disabled={state === 'sending'}>
          {last ? (state === 'sending' ? 'Sending…' : 'Send My Requirements') : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
