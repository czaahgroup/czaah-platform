'use client'

import { useState } from 'react'
import { QUANTITY_UNITS, INCOTERMS } from '@/lib/minerals'

const inputClass = 'bg-surface-container-lowest border border-outline-variant/30 px-3 py-3 text-base text-on-surface w-full focus:border-primary outline-none transition-colors'
const labelClass = 'text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant mb-1.5 block'

/**
 * The request form. With an offer it is a quote request (or, for a joint
 * venture / licence / investment, an enquiry) about that offer; without one
 * it is a sourcing request, and asks which mineral is wanted.
 */
export function RfqForm({
  offer,
  mineral = '',
}: {
  offer?: { id: string; title: string; reference: string; quantity_unit: string; supply: boolean }
  /** Prefills "Mineral wanted" on a sourcing request (e.g. arriving from the guide). */
  mineral?: string
}) {
  const trade = !offer || offer.supply
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '', country: '', commodity: mineral,
    quantity: '', quantity_unit: offer?.quantity_unit || 'MT', incoterm: '', destination_port: '', message: '', hp_field: '',
  })
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const [reference, setReference] = useState<string | null>(null)
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setError('')
    try {
      const res = await fetch('/api/mineral-rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, offer_id: offer?.id, source_page: window.location.pathname }),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.success) {
        setReference(json.reference || null)
        setState('sent')
      } else {
        setError(json?.error || 'Something went wrong. Please try again.')
        setState('error')
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div className="bg-surface-container border border-primary/30 p-6" role="status">
        <h2 className="cinzel-text text-xl text-primary mb-2">Request received</h2>
        <p className="text-on-surface-variant leading-relaxed">
          Thank you. A member of the CZAAH Minerals team will be in touch{reference ? <> — your reference is <strong className="text-on-surface">{reference}</strong></> : null}.
          Nothing is agreed or reserved until we confirm it with you in writing.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-surface-container border border-outline-variant/20 p-5 sm:p-6">
      <h2 className="cinzel-text text-xl text-on-surface mb-1">
        {!offer ? 'Tell us what you need' : offer.supply ? 'Request a quote' : 'Enquire about this opportunity'}
      </h2>
      <p className="text-sm text-on-surface-variant mb-5">
        {offer ? <>About {offer.title} ({offer.reference}). </> : null}Your request goes to CZAAH, not to a third party.
      </p>

      {/* Hidden from people; anything that fills it in is held as spam. */}
      <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
        <label>Leave this field empty<input tabIndex={-1} autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" data-form-type="other" value={form.hp_field} onChange={(e) => set('hp_field', e.target.value)} /></label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={labelClass} htmlFor="rfq-name">Your name *</label>
          <input id="rfq-name" className={inputClass} required maxLength={200} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="rfq-company">Company</label>
          <input id="rfq-company" className={inputClass} maxLength={160} autoComplete="organization" value={form.company} onChange={(e) => set('company', e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="rfq-email">Email *</label>
          <input id="rfq-email" className={inputClass} type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="rfq-phone">Phone / WhatsApp</label>
          <input id="rfq-phone" className={inputClass} type="tel" maxLength={40} autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className={offer ? 'sm:col-span-2' : ''}>
          <label className={labelClass} htmlFor="rfq-country">{trade ? 'Destination country' : 'Your country'}</label>
          <input id="rfq-country" className={inputClass} maxLength={80} autoComplete="country-name" value={form.country} onChange={(e) => set('country', e.target.value)} />
        </div>
        {!offer && (
          <div>
            <label className={labelClass} htmlFor="rfq-commodity">Mineral wanted *</label>
            <input id="rfq-commodity" className={inputClass} required maxLength={80} value={form.commodity} onChange={(e) => set('commodity', e.target.value)} placeholder="e.g. Chromite, 42% and above" />
          </div>
        )}
      </div>

      {trade && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass} htmlFor="rfq-quantity">Quantity</label>
            <input id="rfq-quantity" className={inputClass} type="number" min={0} step="any" inputMode="decimal" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="rfq-unit">Unit</label>
            <select id="rfq-unit" className={inputClass} value={form.quantity_unit} onChange={(e) => set('quantity_unit', e.target.value)}>
              {QUANTITY_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="rfq-incoterm">Delivery terms</label>
            <select id="rfq-incoterm" className={inputClass} value={form.incoterm} onChange={(e) => set('incoterm', e.target.value)}>
              <option value="">Not sure / open</option>
              {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="rfq-port">Destination port</label>
            <input id="rfq-port" className={inputClass} maxLength={120} value={form.destination_port} onChange={(e) => set('destination_port', e.target.value)} />
          </div>
        </div>
      )}

      <div className="mb-5">
        <label className={labelClass} htmlFor="rfq-message">{trade ? 'Specification and anything else' : 'Your interest'}</label>
        <textarea id="rfq-message" className={inputClass} rows={4} maxLength={5000} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder={trade ? 'Grade, size, packaging, timing…' : 'Tell us about you and what you are looking for.'} />
      </div>

      {state === 'error' && <p className="text-sm text-red-400 mb-4" role="alert">{error}</p>}
      <button type="submit" disabled={state === 'sending'} className="liquid-gold-bg text-on-primary px-8 py-4 font-bold tracking-[0.15em] uppercase text-sm disabled:opacity-60 w-full sm:w-auto">
        {state === 'sending' ? 'Sending…' : !offer || offer.supply ? 'Send request' : 'Send enquiry'}
      </button>
    </form>
  )
}
