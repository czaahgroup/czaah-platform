'use client'

import { useCallback, useEffect, useState } from 'react'
import { MineralOfferForm, EMPTY_MINERAL, formFromOffer, payloadFromMineral, type MineralFormValues } from '@/components/MineralOfferForm'
import { publicUrl } from '@/components/PhotoUploader'
import { CATEGORY_LABEL, OFFER_TYPE_LABEL, RFQ_KIND_LABEL, RFQ_STATUSES, offerPrice, offerQuantity, type PublicOffer } from '@/lib/minerals'

type Offer = PublicOffer & {
  status: string
  partner_id: string | null
  rejection_notes: string | null
  verification_notes: string | null
  verified_at: string | null
  profiles: { full_name: string; email: string } | null
}

interface Rfq {
  id: string
  reference: string
  kind: string
  status: string
  offer_reference: string | null
  offer_title: string | null
  commodity: string | null
  name: string
  company: string | null
  email: string
  phone: string | null
  country: string | null
  quantity: number | null
  quantity_unit: string | null
  incoterm: string | null
  destination_port: string | null
  message: string | null
  admin_notes: string | null
  created_at: string
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  sold: 'bg-neutral-500/20 text-neutral-400',
  inactive: 'bg-neutral-500/20 text-neutral-400',
  new: 'bg-yellow-500/20 text-yellow-400',
  contacted: 'bg-blue-500/20 text-blue-400',
  quoted: 'bg-purple-500/20 text-purple-400',
  won: 'bg-green-500/20 text-green-400',
  lost: 'bg-neutral-500/20 text-neutral-400',
  spam: 'bg-red-500/20 text-red-400',
}

const ghost = 'text-xs px-3 py-1.5 border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 transition-colors disabled:opacity-40'
const field = 'bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface w-full'

export default function AdminMineralsPage() {
  const [tab, setTab] = useState<'offers' | 'rfqs'>('offers')
  const [offers, setOffers] = useState<Offer[]>([])
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [showSpam, setShowSpam] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/minerals')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load minerals.')
      setOffers(json.offers || [])
      setRfqs(json.rfqs || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load minerals.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function send(url: string, method: string, body: unknown, done: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'That did not work.')
      setNotice(done)
      setNotes('')
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const offerAction = (o: Offer, body: Record<string, unknown>, done: string) => send(`/api/admin/minerals/${o.id}`, 'PATCH', body, `${o.reference}: ${done}`)

  async function saveOffer(values: MineralFormValues, id: string | null) {
    const res = await fetch(id ? `/api/admin/minerals/${id}` : '/api/admin/minerals', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFromMineral(values)),
    }).catch(() => null)
    const json = await res?.json().catch(() => ({}))
    if (!res?.ok) return json?.error || 'The offer could not be saved.'
    setAdding(false)
    setEditingId(null)
    setNotice(id ? 'Offer saved.' : 'Offer added and live on CZAAH Minerals.')
    await load()
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center">Loading minerals…</div>

  const pending = offers.filter((o) => o.status === 'pending').length
  const newRfqs = rfqs.filter((r) => r.status === 'new').length
  const visibleRfqs = rfqs.filter((r) => showSpam || r.status !== 'spam')

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-4">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Minerals</h1>
        <div className="flex gap-2 flex-wrap">
          <a href="https://minerals.czaah.com" target="_blank" rel="noopener noreferrer" className={ghost}>Open minerals.czaah.com</a>
          <button className="text-xs px-4 py-2 border border-primary/40 text-primary hover:border-primary transition-colors" onClick={() => { setAdding((v) => !v); setEditingId(null) }}>
            {adding ? 'Cancel' : '+ Add offer'}
          </button>
        </div>
      </div>
      <p className="text-sm text-on-surface-variant mb-5 max-w-3xl">
        Offers on minerals.czaah.com and the requests buyers send. A partner&rsquo;s offer is public only after you approve it.
        Mark an offer Verified only when you have seen the assay or licence, and record what you saw.
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4"><p className="text-sm text-red-400">{error}</p></div>}
      {notice && <div className="bg-green-500/10 border border-green-500/20 px-4 py-3 mb-4"><p className="text-sm text-green-400">{notice}</p></div>}

      {adding && (
        <div className="mb-6 max-w-3xl">
          <p className="text-sm text-on-surface-variant mb-3">An offer you add is CZAAH&rsquo;s own and goes live straight away.</p>
          <MineralOfferForm initial={EMPTY_MINERAL} submitLabel="Add offer" busyLabel="Saving…" onSubmit={(v) => saveOffer(v, null)} onCancel={() => setAdding(false)} />
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {([['offers', `Offers${pending ? ` · ${pending} to review` : ''}`], ['rfqs', `Requests${newRfqs ? ` · ${newRfqs} new` : ''}`]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`text-sm px-4 py-2 border ${tab === key ? 'border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'offers' && (
        offers.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center">
            <p className="text-on-surface-variant">No mineral offers yet. Add one, or wait for a partner to submit one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {offers.map((o) => {
              const open = openId === o.id
              const image = o.images?.[0] ? publicUrl(o.images[0]) : null
              return (
                <div key={o.id} className="bg-surface-container-low border border-outline-variant/10">
                  <button onClick={() => { setOpenId(open ? null : o.id); setEditingId(null); setNotes('') }} className="w-full text-left px-5 py-4">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="text-sm font-medium text-on-surface">{o.title}</span>
                      <span className={`text-xs px-2 py-0.5 ${STATUS_COLOR[o.status] || ''}`}>{o.status}</span>
                      {o.verified && <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400">verified</span>}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {o.reference} · {OFFER_TYPE_LABEL[o.offer_type]} · {o.commodity} · {[o.origin_region, o.origin_country].filter(Boolean).join(', ')} ·{' '}
                      {o.profiles ? `Partner: ${o.profiles.full_name}` : 'CZAAH direct'}
                    </div>
                  </button>

                  {open && editingId === o.id && (
                    <div className="px-5 pb-5 border-t border-outline-variant/10 pt-4 max-w-3xl">
                      <MineralOfferForm initial={formFromOffer(o as unknown as Record<string, unknown>)} submitLabel="Save offer" busyLabel="Saving…" onSubmit={(v) => saveOffer(v, o.id)} onCancel={() => setEditingId(null)} />
                    </div>
                  )}

                  {open && editingId !== o.id && (
                    <div className="px-5 pb-5 border-t border-outline-variant/10 pt-4 flex flex-col gap-4">
                      <div className="flex gap-4 flex-wrap">
                        {image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt="" className="w-40 h-28 object-cover" />
                        )}
                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-on-surface-variant flex-1 min-w-[240px]">
                          {([
                            ['Category', CATEGORY_LABEL[o.category]],
                            ['Form', o.form],
                            ['Grade', o.grade],
                            ['Quantity', offerQuantity(o.quantity_available, o.quantity_unit)],
                            ['Minimum order', offerQuantity(o.min_order, o.quantity_unit)],
                            ['Price', offerPrice(o) || 'On request'],
                            ['Terms', [o.incoterm, o.loading_port].filter(Boolean).join(' ')],
                            ['Capacity', o.supply_capacity],
                            ['Packaging', o.packaging],
                            ['Seller says', [o.has_assay_report && 'assay report held', o.has_export_licence && 'lease / licence held'].filter(Boolean).join(', ') || 'no documents stated'],
                            ['Seller', o.profiles ? `${o.profiles.full_name} (${o.profiles.email})` : 'CZAAH direct'],
                          ] as [string, string | null | false][]).filter(([, v]) => v).map(([k, v]) => (
                            <div key={k}><span className="text-on-surface-variant/50">{k}:</span> {v}</div>
                          ))}
                        </div>
                      </div>
                      {o.description && <p className="text-sm text-on-surface-variant whitespace-pre-line">{o.description}</p>}
                      {o.status === 'rejected' && o.rejection_notes && <p className="text-sm text-red-400">Rejected: {o.rejection_notes}</p>}
                      {o.verified && o.verification_notes && (
                        <p className="text-sm text-green-400">Verified{o.verified_at ? ` ${new Date(o.verified_at).toLocaleDateString('en-GB')}` : ''}: {o.verification_notes}</p>
                      )}

                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className={field}
                        placeholder={o.status === 'pending' ? 'Reason if rejecting (the partner sees this) — or what you checked, if verifying' : 'What you checked, if verifying (e.g. assay report dated …, licence no. …)'}
                      />
                      <div className="flex gap-2 flex-wrap">
                        {o.status === 'pending' && (
                          <>
                            <button disabled={busy} className="text-xs px-3 py-1.5 border border-green-500/40 text-green-400 disabled:opacity-40" onClick={() => offerAction(o, { action: 'approve' }, 'approved and live.')}>Approve</button>
                            <button disabled={busy} className="text-xs px-3 py-1.5 border border-red-500/40 text-red-400 disabled:opacity-40" onClick={() => offerAction(o, { action: 'reject', notes }, 'rejected.')}>Reject</button>
                          </>
                        )}
                        {o.verified ? (
                          <button disabled={busy} className={ghost} onClick={() => offerAction(o, { action: 'unverify' }, 'no longer verified.')}>Remove Verified</button>
                        ) : (
                          <button disabled={busy || !notes.trim()} className={ghost} title="Record what you checked first" onClick={() => offerAction(o, { action: 'verify', notes }, 'marked Verified.')}>Mark Verified</button>
                        )}
                        {o.status === 'approved' && <button disabled={busy} className={ghost} onClick={() => offerAction(o, { action: 'set_status', status: 'inactive' }, 'taken off the site.')}>Take off site</button>}
                        {(o.status === 'inactive' || o.status === 'sold' || o.status === 'rejected') && (
                          <button disabled={busy} className={ghost} onClick={() => offerAction(o, { action: 'set_status', status: 'approved' }, 'live.')}>Put live</button>
                        )}
                        <button className={ghost} onClick={() => setEditingId(o.id)}>Edit</button>
                        {o.status === 'approved' && <a className={ghost} href={`https://minerals.czaah.com/offers/${o.id}`} target="_blank" rel="noopener noreferrer">View on site</a>}
                        <button disabled={busy} className="text-xs px-3 py-1.5 border border-red-500/30 text-red-400 disabled:opacity-40" onClick={() => window.confirm(`Delete ${o.title}?`) && send(`/api/admin/minerals/${o.id}`, 'DELETE', null, `${o.reference}: deleted.`)}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === 'rfqs' && (
        <>
          <label className="flex items-center gap-2 text-xs text-on-surface-variant mb-3">
            <input type="checkbox" checked={showSpam} onChange={(e) => setShowSpam(e.target.checked)} /> Show spam
          </label>
          {visibleRfqs.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center">
              <p className="text-on-surface-variant">No requests yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleRfqs.map((r) => {
                const open = openId === r.id
                return (
                  <div key={r.id} className="bg-surface-container-low border border-outline-variant/10">
                    <button onClick={() => { setOpenId(open ? null : r.id); setNotes(r.admin_notes || '') }} className="w-full text-left px-5 py-4">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="text-sm font-medium text-on-surface">{r.name}{r.company ? ` · ${r.company}` : ''}</span>
                        <span className={`text-xs px-2 py-0.5 ${STATUS_COLOR[r.status] || ''}`}>{r.status}</span>
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {r.reference} · {RFQ_KIND_LABEL[r.kind] || r.kind} · {r.offer_title ? `${r.offer_title} (${r.offer_reference})` : r.commodity || 'General'} · {new Date(r.created_at).toLocaleString('en-GB')}
                      </div>
                    </button>
                    {open && (
                      <div className="px-5 pb-5 border-t border-outline-variant/10 pt-4 flex flex-col gap-3">
                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-on-surface-variant">
                          {([
                            ['Email', r.email], ['Phone', r.phone], ['Country', r.country],
                            ['Quantity', offerQuantity(r.quantity, r.quantity_unit)], ['Delivery terms', r.incoterm], ['Destination port', r.destination_port],
                          ] as [string, string | null][]).filter(([, v]) => v).map(([k, v]) => (
                            <div key={k}><span className="text-on-surface-variant/50">{k}:</span> {k === 'Email' ? <a className="text-primary" href={`mailto:${v}`}>{v}</a> : v}</div>
                          ))}
                        </div>
                        {r.message && <p className="text-sm text-on-surface-variant whitespace-pre-line">{r.message}</p>}
                        <div className="flex gap-2 flex-wrap items-center">
                          <span className="text-xs text-on-surface-variant/60">Status</span>
                          <select className="bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface" value={r.status} disabled={busy}
                            onChange={(e) => send('/api/admin/minerals/rfqs', 'PATCH', { id: r.id, status: e.target.value }, `${r.reference}: status updated.`)}>
                            {RFQ_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={field} placeholder="Internal notes (admin-only)" />
                        <div className="flex gap-2 flex-wrap">
                          <button disabled={busy} className={ghost} onClick={() => send('/api/admin/minerals/rfqs', 'PATCH', { id: r.id, admin_notes: notes }, `${r.reference}: notes saved.`)}>Save notes</button>
                          <button disabled={busy} className="text-xs px-3 py-1.5 border border-red-500/30 text-red-400 disabled:opacity-40" onClick={() => window.confirm(`Delete request ${r.reference}?`) && send(`/api/admin/minerals/rfqs?id=${r.id}`, 'DELETE', null, `${r.reference}: deleted.`)}>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
