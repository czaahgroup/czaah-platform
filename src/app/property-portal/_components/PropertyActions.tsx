'use client';

import { useEffect, useRef, useState } from 'react';
import { portalPhone, portalWhatsApp } from './portalRuntime';
import { track } from './analytics';
import { Button } from './ui';

// Listing actions (brief §11, §33): enquire and request a viewing without an
// account, Call / WhatsApp to CZAAH's own numbers (never the owner's), share.
// Requests go to the enquiries inbox tagged with the listing and its reference.

export function listingReference(id: string) {
  return `CZ-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export interface ActionListing {
  id: string;
  title: string;
  city?: string | null;
  country?: string | null;
}

function listingUrl(id: string) {
  if (typeof window === 'undefined') return `https://property.czaah.com/${id}`;
  // On czaah.com/property-portal the clean path is under /property-portal.
  return window.location.hostname === 'property.czaah.com'
    ? `https://property.czaah.com/${id}`
    : `${window.location.origin}/property-portal/${id}`;
}

export function whatsappHref(p: ActionListing) {
  const n = portalWhatsApp();
  if (!n) return null;
  const text = `Hello CZAAH Properties, I'm interested in "${p.title}" (${listingReference(p.id)}): ${listingUrl(p.id)}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function phoneHref() {
  const n = portalPhone();
  return n ? `tel:${n.replace(/[^\d+]/g, '')}` : null;
}

type Mode = 'enquiry' | 'viewing';
const SLOTS = ['Morning (9–12)', 'Afternoon (12–5)', 'Evening (5–8)', 'Any time'];

/** The enquiry / viewing form. `mode` switches which request is sent. */
export function EnquiryForm({
  listing,
  mode,
  onModeChange,
  rental,
}: {
  listing: ActionListing;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  rental: boolean;
}) {
  const ref = listingReference(listing.id);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', date: '', slot: SLOTS[3] });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError('');
    const kind = mode === 'viewing' ? 'Viewing request' : 'Property enquiry';
    const title = listing.title.length > 120 ? `${listing.title.slice(0, 117)}…` : listing.title;
    const lines = [
      form.message.trim() || (mode === 'viewing' ? 'I would like to arrange a viewing.' : 'I would like more information about this property.'),
      '',
      `Listing: ${listing.title}`,
      `Reference: ${ref}`,
      `Link: ${listingUrl(listing.id)}`,
      mode === 'viewing' ? `Preferred date: ${form.date || 'flexible'}` : null,
      mode === 'viewing' ? `Preferred time: ${form.slot}` : null,
    ].filter((l) => l !== null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          interest: `${kind} — ${title} (${ref})`,
          message: lines.join('\n'),
          source: 'contact_form',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      track(mode === 'viewing' ? 'viewing_request' : 'property_enquiry', { listing_id: listing.id });
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="pp-enquiry-done" role="status">
        <strong>{mode === 'viewing' ? 'Viewing request sent.' : 'Enquiry sent.'}</strong>
        <p>
          The CZAAH Properties team will be in touch{mode === 'viewing' ? ' to confirm a time' : ''}. Your
          reference is {ref}.
        </p>
        <button type="button" className="pp-link-btn" onClick={() => { setState('idle'); setForm((f) => ({ ...f, message: '' })); }}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="pp-enquiry-form" onSubmit={submit} id="enquiry-form">
      <div className="pp-enquiry-modes" role="radiogroup" aria-label="Request type">
        {(['enquiry', 'viewing'] as Mode[]).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'is-active' : undefined} onClick={() => onModeChange(m)}>
            {m === 'enquiry' ? 'Enquire' : 'Book a viewing'}
          </button>
        ))}
      </div>
      <label><span>Name *</span><input required maxLength={200} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
      <label><span>Email *</span><input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
      <label><span>Phone</span><input type="tel" maxLength={50} autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
      {mode === 'viewing' && (
        <div className="pp-enquiry-row">
          <label><span>Preferred date</span><input type="date" min={today} value={form.date} onChange={(e) => set('date', e.target.value)} /></label>
          <label>
            <span>Time</span>
            <select value={form.slot} onChange={(e) => set('slot', e.target.value)}>
              {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      )}
      <label>
        <span>Message</span>
        <textarea
          rows={3}
          maxLength={3000}
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
          placeholder={mode === 'viewing' ? 'Anything we should know about the viewing?' : rental ? 'Move-in date, tenancy length…' : 'Questions about the property, timing, finance…'}
        />
      </label>
      {state === 'error' && <p className="pp-sell-err" role="alert">{error}</p>}
      <Button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : mode === 'viewing' ? 'Request viewing' : 'Send enquiry'}
      </Button>
      <p className="pp-enquire-note">No account needed. Your details go to the CZAAH Properties team only.</p>
    </form>
  );
}

/** Call / WhatsApp buttons, rendered only when CZAAH's numbers are set. */
export function ContactButtons({ listing, className }: { listing: ActionListing; className?: string }) {
  const tel = phoneHref();
  const wa = whatsappHref(listing);
  if (!tel && !wa) return null;
  return (
    <div className={['pp-contact-btns', className].filter(Boolean).join(' ')}>
      {tel && (
        <a href={tel} className="pp-btn pp-btn--ghost" onClick={() => track('phone_click', { listing_id: listing.id })}>Call</a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="pp-btn pp-btn--ghost pp-btn-whatsapp" onClick={() => track('whatsapp_click', { listing_id: listing.id })}>
          WhatsApp
        </a>
      )}
    </div>
  );
}

/** Share: the phone's share sheet where available, otherwise copy the link. */
export function ShareButton({ listing }: { listing: ActionListing }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = listingUrl(listing.id);
    track('property_share', { listing_id: listing.id });
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Cancelled share sheet or blocked clipboard: nothing to do.
    }
  }
  return (
    <button type="button" className="pp-detail-save" onClick={share} aria-live="polite">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
      </svg>
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}

/**
 * Sticky bottom bar on phones (brief §11, §28): Call · WhatsApp · Enquire.
 * It flags <html> so the AI bubble and the footer make room for it.
 */
export function StickyActions({ listing, onEnquire }: { listing: ActionListing; onEnquire: () => void }) {
  const tel = phoneHref();
  const wa = whatsappHref(listing);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-sticky-cta', '');
    return () => root.removeAttribute('data-sticky-cta');
  }, []);
  return (
    <div className="pp-sticky-cta" ref={bar} role="region" aria-label="Contact about this property">
      {tel && <a href={tel} onClick={() => track('phone_click', { listing_id: listing.id, via: 'sticky' })}>Call</a>}
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => track('whatsapp_click', { listing_id: listing.id, via: 'sticky' })}>
          WhatsApp
        </a>
      )}
      <button type="button" className="is-primary" onClick={onEnquire}>Enquire</button>
    </div>
  );
}
