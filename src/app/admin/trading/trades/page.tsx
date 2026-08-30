'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const DESK = ['oil_gas', 'minerals', 'agri', 'other']
const DESK_LABEL: Record<string, string> = { oil_gas: 'Oil & Gas', minerals: 'Minerals', agri: 'Agri', other: 'Other' }
const SIDE = ['buy', 'sell']
const STATUS = ['inquiry', 'offer', 'negotiation', 'contract', 'nomination', 'in_transit', 'delivered', 'settled', 'closed', 'cancelled']
const STATUS_LABEL: Record<string, string> = {
  inquiry: 'Inquiry', offer: 'Offer', negotiation: 'Negotiation', contract: 'Contract', nomination: 'Nomination',
  in_transit: 'In transit', delivered: 'Delivered', settled: 'Settled', closed: 'Closed', cancelled: 'Cancelled',
}
const STATUS_CLS: Record<string, string> = {
  contract: 'text-emerald-400', nomination: 'text-emerald-400', in_transit: 'text-emerald-400', delivered: 'text-emerald-400',
  settled: 'text-on-surface-variant', closed: 'text-on-surface-variant/50', cancelled: 'text-red-400',
}

function TradesInner() {
  const sp = useSearchParams()
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState(sp.get('status') || '')
  const [view, setView] = useState(sp.get('view') || '')
  const [desk, setDesk] = useState('')
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [lookup, setLookup] = useState<any>({ companies: [], deals: [], staff: [] })
  const [ref, setRef] = useState<any>({ countries: [], currencies: [] })
  const [form, setForm] = useState<any>({ title: '', desk: 'oil_gas', side: 'buy', commodity: '', grade: '', counterpartyId: '', dealId: '', quantity: '', quantityUnit: '', priceBasis: '', priceAmount: '', currency: '', incoterm: '', loadPort: '', dischargePort: '', contractType: '', laycanStart: '', laycanEnd: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { const t = setTimeout(() => setQd(q.trim()), 300); return () => clearTimeout(t) }, [q])
  useEffect(() => {
    fetch('/api/trading/lookup').then((r) => r.ok && r.json()).then((j) => j && setLookup(j))
    fetch('/api/reference').then((r) => r.ok && r.json()).then((j) => j && setRef({ countries: j.countries || [], currencies: j.currencies || [] }))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (status) params.set('status', status)
      if (view) params.set('view', view)
      if (desk) params.set('desk', desk)
      if (qd) params.set('q', qd)
      const res = await fetch(`/api/trading/trades?${params}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setRows(j.data); setTotal(j.total); setHasMore(j.hasMore)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [page, status, view, desk, qd])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [status, view, desk, qd])

  async function create() {
    if (!form.title.trim() || !form.commodity.trim()) { setError('Trade title and commodity are required.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/trading/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not create')
      setShowNew(false)
      setForm({ title: '', desk: 'oil_gas', side: 'buy', commodity: '', grade: '', counterpartyId: '', dealId: '', quantity: '', quantityUnit: '', priceBasis: '', priceAmount: '', currency: '', incoterm: '', loadPort: '', dischargePort: '', contractType: '', laycanStart: '', laycanEnd: '', notes: '' })
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Trades</h1>
        <button onClick={() => setShowNew(true)} className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors">+ New Trade</button>
      </div>
      <p className="text-sm text-on-surface-variant mb-6">{total.toLocaleString()} trade{total === 1 ? '' : 's'}</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4 text-sm text-red-400">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, reference, commodity…" className={`${inputCls} max-w-xs`} />
        <select value={desk} onChange={(e) => setDesk(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm">
          <option value="">All desks</option>
          {DESK.map((s) => <option key={s} value={s}>{DESK_LABEL[s]}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setView('') }} className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm">
          <option value="">All statuses</option>
          {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center text-on-surface-variant text-sm">No trades match.</div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  {['Reference', 'Title', 'Side', 'Commodity', 'Counterparty', 'Quantity', 'Incoterm', 'Status'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest/40 transition-colors">
                    <td className="px-5 py-3"><Link href={`/admin/trading/trades/${t.id}`} className="text-primary font-mono text-xs hover:underline">{t.reference}</Link></td>
                    <td className="px-5 py-3 text-on-surface">{t.title}</td>
                    <td className="px-5 py-3 text-on-surface-variant uppercase text-xs">{t.side}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{t.commodity}{t.grade ? ` · ${t.grade}` : ''}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{t.counterparty?.name || '—'}</td>
                    <td className="px-5 py-3 text-on-surface-variant tabular-nums">{t.quantity ? `${Number(t.quantity).toLocaleString()} ${t.quantity_unit || ''}` : '—'}</td>
                    <td className="px-5 py-3 text-on-surface-variant text-xs">{t.incoterm || '—'}</td>
                    <td className={`px-5 py-3 text-xs ${STATUS_CLS[t.status] || 'text-on-surface-variant'}`}>{STATUS_LABEL[t.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="text-primary disabled:opacity-30 px-2 py-1">← Previous</button>
          <span className="text-on-surface-variant/50 text-xs">Page {page + 1}</span>
          <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className="text-primary disabled:opacity-30 px-2 py-1">Next →</button>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowNew(false)}>
          <div className="bg-surface-container-low border border-outline-variant/10 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-5">New Trade</h2>
            <div className="space-y-3">
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} autoFocus placeholder="e.g. EN590 10ppm — Rotterdam CIF" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Desk</label>
                  <select value={form.desk} onChange={(e) => setForm((f) => ({ ...f, desk: e.target.value }))} className={inputCls}>
                    {DESK.map((s) => <option key={s} value={s}>{DESK_LABEL[s]}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Side</label>
                  <select value={form.side} onChange={(e) => setForm((f) => ({ ...f, side: e.target.value }))} className={inputCls}>
                    {SIDE.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Incoterm</label>
                  <input value={form.incoterm} onChange={(e) => setForm((f) => ({ ...f, incoterm: e.target.value }))} className={inputCls} placeholder="CIF" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Commodity *</label>
                  <input value={form.commodity} onChange={(e) => setForm((f) => ({ ...f, commodity: e.target.value }))} className={inputCls} placeholder="Crude oil" /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Grade</label>
                  <input value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} className={inputCls} placeholder="Bonny Light" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Counterparty</label>
                  <select value={form.counterpartyId} onChange={(e) => setForm((f) => ({ ...f, counterpartyId: e.target.value }))} className={inputCls}>
                    <option value="">—</option>
                    {lookup.companies.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Linked deal</label>
                  <select value={form.dealId} onChange={(e) => setForm((f) => ({ ...f, dealId: e.target.value }))} className={inputCls}>
                    <option value="">—</option>
                    {lookup.deals.map((x) => <option key={x.id} value={x.id}>{x.reference} · {x.title}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Quantity</label>
                  <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Unit</label>
                  <input value={form.quantityUnit} onChange={(e) => setForm((f) => ({ ...f, quantityUnit: e.target.value }))} className={inputCls} placeholder="bbl / MT" /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Contract</label>
                  <input value={form.contractType} onChange={(e) => setForm((f) => ({ ...f, contractType: e.target.value }))} className={inputCls} placeholder="spot / term" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><label className="block text-xs text-on-surface-variant mb-1.5">Price / basis</label>
                  <input value={form.priceBasis} onChange={(e) => setForm((f) => ({ ...f, priceBasis: e.target.value }))} className={inputCls} placeholder="Platts Dated Brent + 1.20" /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Price</label>
                  <input type="number" value={form.priceAmount} onChange={(e) => setForm((f) => ({ ...f, priceAmount: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Load port</label>
                  <input value={form.loadPort} onChange={(e) => setForm((f) => ({ ...f, loadPort: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Discharge port</label>
                  <input value={form.dischargePort} onChange={(e) => setForm((f) => ({ ...f, dischargePort: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Laycan start</label>
                  <input type="date" value={form.laycanStart} onChange={(e) => setForm((f) => ({ ...f, laycanStart: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Laycan end</label>
                  <input type="date" value={form.laycanEnd} onChange={(e) => setForm((f) => ({ ...f, laycanEnd: e.target.value }))} className={inputCls} /></div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-on-surface-variant border border-outline-variant/10">Cancel</button>
              <button onClick={create} disabled={saving} className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm disabled:opacity-50">{saving ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TradesPage() {
  return <Suspense fallback={<div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>}><TradesInner /></Suspense>
}
