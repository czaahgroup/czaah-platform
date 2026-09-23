'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { portalLocations } from '../_components/portalRuntime';
import { CURRENCIES } from '../_components/types';
import { Button, ButtonLink } from '../_components/ui';
import {
  SUBMISSION_PROPERTY_TYPES,
  SUBMISSION_MAX_IMAGES,
  SUBMISSION_MAX_IMAGE_BYTES,
  TIMELINES,
  type SubmissionKind,
} from '@/lib/propertySubmissions';

// /sell — four paths (brief §7). Every submission is stored for review and is
// never published automatically: Admin → Submissions → (convert) → Admin →
// Properties approval.

const PATHS: { v: SubmissionKind; t: string; d: string }[] = [
  { v: 'sell', t: 'Sell my property', d: 'Tell us about a home, commercial unit or plot you want to sell.' },
  { v: 'let', t: 'Let my property', d: 'Find a tenant for a residential or commercial property.' },
  { v: 'development', t: 'List a development', d: 'Developers: present a new or off-plan project to our buyers.' },
  { v: 'partnership', t: 'Agent / developer partnership', d: 'Work with CZAAH Properties across our markets.' },
];

const STEPS = [
  { t: 'You send the details', d: 'A few minutes, with photos if you have them.' },
  { t: 'We review them', d: 'Nothing is published at this stage.' },
  { t: 'We get in touch', d: 'To confirm the details, price and next steps with you.' },
  { t: 'Publication by agreement', d: 'A listing only goes live once you and CZAAH have agreed it.' },
];

const POINTS = [
  { t: 'International reach', d: 'Your property is presented to buyers, tenants and investors across the markets CZAAH Properties covers — not only a local audience.' },
  { t: 'Clear presentation', d: 'Each property is shown on the details people compare — price, size, tenure and, where relevant, rental terms.' },
  { t: 'One point of contact', d: 'One CZAAH Properties team handles the process with you, from first conversation to completion.' },
];

type Form = Record<string, string>;
const EMPTY: Form = {
  full_name: '', email: '', phone: '', message: '',
  country: '', country_other: '', city: '', address: '', property_type: '', bedrooms: '', bathrooms: '',
  size_value: '', size_unit: 'sq_ft', currency: '', expected_price: '', timeline: '',
  expected_rent: '', rent_period: 'month', available_from: '', furnishing: '',
  company: '', development_name: '', units_count: '', completion: '', website: '',
  partner_type: '', markets: '',
};

function SellInner() {
  const router = useRouter();
  const params = useSearchParams();
  const kind = (PATHS.some((p) => p.v === params.get('path')) ? params.get('path') : null) as SubmissionKind | null;

  const countries = useMemo(() => (portalLocations() || []).flatMap((r) => r.countries), []);
  const [form, setForm] = useState<Form>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fileError, setFileError] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [reference, setReference] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Default the currency to the chosen market's.
  useEffect(() => {
    const c = countries.find((x) => x.name === form.country);
    if (c && !form.currency) set('currency', c.currency);
  }, [form.country]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function choose(v: SubmissionKind) {
    setStatus('idle');
    setError('');
    router.replace(`/property-portal/sell?path=${v}#sell-form`, { scroll: false });
    setTimeout(() => document.getElementById('sell-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function addFiles(list: FileList | null) {
    setFileError('');
    const picked = Array.from(list || []);
    const next = [...files];
    for (const f of picked) {
      if (!/^image\/(jpeg|png|webp|avif)$/.test(f.type) && !/\.(jpe?g|png|webp|avif)$/i.test(f.name)) {
        setFileError(`"${f.name}" isn't a JPEG, PNG, WebP or AVIF image.`);
        continue;
      }
      if (f.size > SUBMISSION_MAX_IMAGE_BYTES) {
        setFileError(`"${f.name}" is over 8 MB.`);
        continue;
      }
      if (next.length >= SUBMISSION_MAX_IMAGES) {
        setFileError(`Up to ${SUBMISSION_MAX_IMAGES} photos.`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!kind) return;
    setStatus('sending');
    setError('');
    const fd = new FormData();
    fd.set('kind', kind);
    const country = form.country === '__other' ? form.country_other : form.country;
    for (const [k, v] of Object.entries(form)) {
      if (k === 'country' || k === 'country_other') continue;
      if (v) fd.set(k, v);
    }
    if (country) fd.set('country', country);
    // Honeypot: copied from the hidden field (empty for people).
    fd.set('company_site', (e.currentTarget.elements.namedItem('company_site') as HTMLInputElement)?.value || '');
    for (const f of files) fd.append('images', f);

    try {
      const res = await fetch('/api/property-submissions', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      setReference(json.reference || null);
      setStatus('sent');
      setForm(EMPTY);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  const isProperty = kind === 'sell' || kind === 'let';
  const field = (k: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label>
      <span>{label}{props.required ? ' *' : ''}</span>
      <input value={form[k]} onChange={(e) => set(k, e.target.value)} {...props} />
    </label>
  );
  const countrySelect = (
    <>
      <label>
        <span>Country *</span>
        <select required value={form.country} onChange={(e) => set('country', e.target.value)}>
          <option value="">Choose…</option>
          {countries.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          <option value="__other">Another country</option>
        </select>
      </label>
      {form.country === '__other' && field('country_other', 'Which country?', { required: true, maxLength: 100 })}
    </>
  );

  return (
    <main>
      <section className="pp-hero pp-hero--compact">
        <div className="pp-container">
          <div className="pp-eyebrow">CZAAH Properties · Owners &amp; developers</div>
          <h1>Sell, let or list <span className="pp-gold">with CZAAH.</span></h1>
          <p className="pp-hero-lede">
            Reach buyers, tenants and investors across the United Kingdom, Dubai and Pakistan, with
            one team handling valuation, marketing and negotiation. Choose what you&apos;d like to do.
          </p>
        </div>
      </section>

      <section className="pp-section" style={{ paddingTop: 30 }}>
        <div className="pp-container">
          <div className="pp-sell-paths" role="tablist" aria-label="What would you like to do?">
            {PATHS.map((p) => (
              <button
                key={p.v}
                type="button"
                role="tab"
                aria-selected={kind === p.v}
                aria-controls="sell-form"
                className={`pp-sell-path${kind === p.v ? ' is-active' : ''}`}
                onClick={() => choose(p.v)}
              >
                <strong>{p.t}</strong>
                <span>{p.d}</span>
              </button>
            ))}
          </div>

          <div className="pp-intro" style={{ alignItems: 'start', marginTop: 40 }}>
            <div>
              <div className="pp-eyebrow">What happens next</div>
              <ol className="pp-sell-steps">
                {STEPS.map((s) => (
                  <li key={s.t}><strong>{s.t}</strong><span>{s.d}</span></li>
                ))}
              </ol>
              <div className="pp-sell-points">
                {POINTS.map((p) => (
                  <div className="pp-sell-point" key={p.t}>
                    <h3>{p.t}</h3>
                    <p>{p.d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pp-enquire-card" id="sell-form" role="tabpanel" style={{ scrollMarginTop: 110 }}>
              {status === 'sent' ? (
                <div className="pp-sell-sent" role="status">
                  <div className="pp-sell-sent-mark">✓</div>
                  <h3>Thank you — we&apos;ve received your details.</h3>
                  {reference && <p>Your reference is <strong>{reference}</strong>.</p>}
                  <p>
                    A member of the CZAAH Properties team will be in touch. Nothing is published until
                    we&apos;ve spoken and agreed the details. A confirmation is on its way to your email.
                  </p>
                  <ButtonLink href="/property-portal/buy" variant="ghost">Browse properties</ButtonLink>
                </div>
              ) : !kind ? (
                <div className="pp-sell-choose">
                  <h3>Choose an option to begin</h3>
                  <p>Select one of the four options above and the right form appears here.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="pp-sell-form" noValidate={false}>
                  <h3>{PATHS.find((p) => p.v === kind)!.t}</h3>

                  {/* Honeypot — hidden from people and assistive tech. */}
                  <div aria-hidden="true" className="pp-hp">
                    <label>Company website<input name="company_site" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
                  </div>

                  <fieldset>
                    <legend>Your details</legend>
                    {field('full_name', 'Full name', { required: true, maxLength: 200, autoComplete: 'name' })}
                    {field('email', 'Email', { required: true, type: 'email', maxLength: 254, autoComplete: 'email' })}
                    {field('phone', 'Phone', { required: true, type: 'tel', maxLength: 50, autoComplete: 'tel' })}
                    {(kind === 'development' || kind === 'partnership') &&
                      field('company', kind === 'development' ? 'Developer / company' : 'Company', { required: true, maxLength: 200, autoComplete: 'organization' })}
                  </fieldset>

                  {isProperty && (
                    <fieldset>
                      <legend>The property</legend>
                      {countrySelect}
                      {field('city', 'City', { required: true, maxLength: 100 })}
                      {field('address', 'Address or area', { maxLength: 300, placeholder: 'e.g. Business Bay, or street and postcode' })}
                      <label>
                        <span>Property type *</span>
                        <select required value={form.property_type} onChange={(e) => set('property_type', e.target.value)}>
                          <option value="">Choose…</option>
                          {SUBMISSION_PROPERTY_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                        </select>
                      </label>
                      <div className="pp-sell-row">
                        {field('bedrooms', 'Bedrooms', { type: 'number', min: 0, max: 50, inputMode: 'numeric' })}
                        {field('bathrooms', 'Bathrooms', { type: 'number', min: 0, max: 50, inputMode: 'numeric' })}
                      </div>
                      <div className="pp-sell-row">
                        {field('size_value', 'Approximate size', { type: 'number', min: 0, step: 'any', inputMode: 'decimal' })}
                        <label>
                          <span>Unit</span>
                          <select value={form.size_unit} onChange={(e) => set('size_unit', e.target.value)}>
                            <option value="sq_ft">sq ft</option>
                            <option value="sq_m">sq m</option>
                            <option value="sq_yd">sq yd</option>
                            <option value="marla">marla</option>
                            <option value="kanal">kanal</option>
                            <option value="acre">acre</option>
                          </select>
                        </label>
                      </div>
                    </fieldset>
                  )}

                  {kind === 'sell' && (
                    <fieldset>
                      <legend>Price &amp; timing</legend>
                      <div className="pp-sell-row">
                        <label>
                          <span>Currency</span>
                          <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                            <option value="">Choose…</option>
                            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </label>
                        {field('expected_price', 'Expected price', { type: 'number', min: 0, step: 'any', inputMode: 'numeric' })}
                      </div>
                      <label>
                        <span>When would you like to sell?</span>
                        <select value={form.timeline} onChange={(e) => set('timeline', e.target.value)}>
                          <option value="">Choose…</option>
                          {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                    </fieldset>
                  )}

                  {kind === 'let' && (
                    <fieldset>
                      <legend>Rent &amp; availability</legend>
                      <div className="pp-sell-row">
                        <label>
                          <span>Currency</span>
                          <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                            <option value="">Choose…</option>
                            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </label>
                        {field('expected_rent', 'Expected rent', { type: 'number', min: 0, step: 'any', inputMode: 'numeric' })}
                      </div>
                      <div className="pp-sell-row">
                        <label>
                          <span>Per</span>
                          <select value={form.rent_period} onChange={(e) => set('rent_period', e.target.value)}>
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                          </select>
                        </label>
                        {field('available_from', 'Available from', { type: 'date' })}
                      </div>
                      <label>
                        <span>Furnishing</span>
                        <select value={form.furnishing} onChange={(e) => set('furnishing', e.target.value)}>
                          <option value="">Choose…</option>
                          <option value="furnished">Furnished</option>
                          <option value="part_furnished">Part furnished</option>
                          <option value="unfurnished">Unfurnished</option>
                        </select>
                      </label>
                    </fieldset>
                  )}

                  {kind === 'development' && (
                    <fieldset>
                      <legend>The development</legend>
                      {field('development_name', 'Development name', { required: true, maxLength: 200 })}
                      {countrySelect}
                      {field('city', 'City', { required: true, maxLength: 100 })}
                      <div className="pp-sell-row">
                        {field('units_count', 'Number of units', { type: 'number', min: 1, inputMode: 'numeric' })}
                        {field('completion', 'Expected completion', { maxLength: 100, placeholder: 'e.g. Q4 2027' })}
                      </div>
                      {field('website', 'Website', { type: 'url', maxLength: 300, placeholder: 'https://' })}
                    </fieldset>
                  )}

                  {kind === 'partnership' && (
                    <fieldset>
                      <legend>About you</legend>
                      <label>
                        <span>You are *</span>
                        <select required value={form.partner_type} onChange={(e) => set('partner_type', e.target.value)}>
                          <option value="">Choose…</option>
                          <option value="agent">An estate agent / brokerage</option>
                          <option value="developer">A developer</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      {field('markets', 'Markets you work in', { maxLength: 300, placeholder: 'e.g. Dubai, Lahore' })}
                      {field('website', 'Website', { type: 'url', maxLength: 300, placeholder: 'https://' })}
                    </fieldset>
                  )}

                  {kind !== 'partnership' && (
                    <fieldset>
                      <legend>Photos (optional)</legend>
                      <label className="pp-sell-upload">
                        <span>Add up to {SUBMISSION_MAX_IMAGES} photos — JPEG, PNG, WebP or AVIF, 8 MB each</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                      </label>
                      {fileError && <p className="pp-sell-err" role="alert">{fileError}</p>}
                      {previews.length > 0 && (
                        <ul className="pp-sell-thumbs">
                          {previews.map((u, i) => (
                            <li key={u}>
                              <img src={u} alt={`Photo ${i + 1}`} />
                              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </fieldset>
                  )}

                  <label>
                    <span>{kind === 'partnership' ? 'How would you like to work together?' : 'Anything else we should know?'}</span>
                    <textarea rows={4} maxLength={5000} value={form.message} onChange={(e) => set('message', e.target.value)} />
                  </label>

                  {status === 'error' && <p className="pp-sell-err" role="alert">{error}</p>}
                  <Button type="submit" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Send for review'}
                  </Button>
                  <p className="pp-enquire-note">
                    Your details go to the CZAAH Properties team only. Nothing is published without your
                    agreement. See our <a href="/privacy" className="pp-gold">privacy policy</a>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="pp-cta-band">
        <div className="pp-container">
          <h2 className="pp-h2">Prefer to talk it through first?</h2>
          <p>Speak to the CZAAH Properties team about valuation, timing and the process.</p>
          <div className="pp-cta-actions">
            <ButtonLink href="/property-portal/contact">Speak to CZAAH</ButtonLink>
            <ButtonLink href="/property-portal/buy" variant="ghost">Browse properties</ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={<main><div className="pp-container" style={{ padding: '120px 0' }} /></main>}>
      <SellInner />
    </Suspense>
  );
}
