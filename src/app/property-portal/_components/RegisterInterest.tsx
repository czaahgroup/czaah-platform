'use client';

import { useState } from 'react';
import { Button } from './ui';

/**
 * "Register your interest" for a market CZAAH is expanding into. Sends a
 * normal enquiry (it lands in Admin → Enquiries tagged with the market), so
 * no new pipeline is needed to capture the lead.
 */
export function RegisterInterest({ market }: { market: string }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          interest: `Register interest — ${market}`,
          message: form.message.trim() || `Please keep me informed about property in ${market}.`,
          source: 'contact_form',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong.');
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <p className="pp-interest-done" role="status">
        Thank you — we&apos;ll be in touch as {market} opportunities become available.
      </p>
    );
  }

  return (
    <form className="pp-interest-form" onSubmit={submit}>
      <label>
        <span>Name</span>
        <input required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
      </label>
      <label>
        <span>Email</span>
        <input required type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
      </label>
      <label>
        <span>Phone (optional)</span>
        <input type="tel" maxLength={50} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
      </label>
      <label className="pp-interest-wide">
        <span>What are you looking for? (optional)</span>
        <textarea rows={2} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Country, city, budget, property type…" />
      </label>
      <div className="pp-interest-wide pp-interest-actions">
        <Button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Register interest'}
        </Button>
        {state === 'error' && <span className="pp-interest-error" role="alert">{error}</span>}
      </div>
    </form>
  );
}
