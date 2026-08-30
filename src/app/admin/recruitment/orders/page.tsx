'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const STATUS = ['draft', 'open', 'partially_filled', 'filled', 'on_hold', 'closed', 'cancelled']
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', open: 'Open', partially_filled: 'Partly filled', filled: 'Filled',
  on_hold: 'On hold', closed: 'Closed', cancelled: 'Cancelled',
}
const STATUS_CLS: Record<string, string> = {
  open: 'text-emerald-400', partially_filled: 'text-amber-400', filled: 'text-on-surface-variant',
  on_hold: 'text-amber-400', draft: 'text-on-surface-variant/50', closed: 'text-on-surface-variant/50',
  cancelled: 'text-red-400',
}

function OrdersInner() {
  const sp = useSearchParams()
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState(sp.get('status') || '')
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [lookup, setLookup] = useState<any>({ employers: [], oeps: [], staff: [] })
  const [ref, setRef] = useState<any>({ countries: [], currencies: [] })
  const [form, setForm] = useState<any>({ title: '', tradeCategory: '', specificRole: '', headcount: 1, destinationCountry: '', employerId: '', oepId: '', salaryMin: '', salaryMax: '', salaryCurrency: '', contractMonths: '', targetDate: '', requirements: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { const t = setTimeout(() => setQd(q.trim()), 300); return () => clearTimeout(t) }, [q])
  useEffect(() => {
    fetch('/api/recruitment/lookup').then((r) => r.ok && r.json()).then((j) => j && setLookup(j))
    fetch('/api/reference').then((r) => r.ok && r.json()).then((j) => j && setRef({ countries: j.countries || [], currencies: j.currencies || [] }))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (status) params.set('status', status)
      if (qd) params.set('q', qd)
      const res = await fetch(`/api/recruitment/orders?${params}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setRows(j.data); setTotal(j.total); setHasMore(j.hasMore)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [page, status, qd])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [status, qd])

  async function create() {
    if (!form.title.trim() || !form.tradeCategory.trim()) { setError('Job title and trade category are required.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/recruitment/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not create')
      setShowNew(false)
      setForm({ title: '', tradeCategory: '', specificRole: '', headcount: 1, destinationCountry: '', employerId: '', oepId: '', salaryMin: '', salaryMax: '', salaryCurrency: '', contractMonths: '', targetDate: '', requirements: '' })
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Job Orders</h1>
        <button onClick={() => setShowNew(true)} className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors">+ New Order</button>
      </div>
      <p className="text-sm text-on-surface-variant mb-6">{total.toLocaleString()} order{total === 1 ? '' : 's'}</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4 text-sm text-red-400">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, reference, role…" className={`${inputCls} max-w-xs`} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm">
          <option value="">All statuses</option>
          {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center text-on-surface-variant text-sm">No job orders match.</div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  {['Reference', 'Title', 'Trade', 'Destination', 'Client', 'Filled', 'Status'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest/40 transition-colors">
                    <td className="px-5 py-3"><Link href={`/admin/recruitment/orders/${o.id}`} className="text-primary font-mono text-xs hover:underline">{o.reference}</Link></td>
                    <td className="px-5 py-3 text-on-surface">{o.title}{o.specific_role && <span className="text-on-surface-variant/60"> · {o.specific_role}</span>}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{o.trade_category}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{o.destination_country || '—'}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{o.employer?.company_name || o.oep?.company_name || o.company?.name || '—'}</td>
                    <td className="px-5 py-3 text-on-surface-variant tabular-nums">{o.candidateCount}/{o.headcount}</td>
                    <td className={`px-5 py-3 text-xs ${STATUS_CLS[o.status] || 'text-on-surface-variant'}`}>{STATUS_LABEL[o.status]}</td>
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
            <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-5">New Job Order</h2>
            <div className="space-y-3">
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Job title *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} autoFocus placeholder="e.g. Site electricians — Dubai metro" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Trade category *</label>
                  <input value={form.tradeCategory} onChange={(e) => setForm((f) => ({ ...f, tradeCategory: e.target.value }))} className={inputCls} placeholder="Electrical" /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Specific role</label>
                  <input value={form.specificRole} onChange={(e) => setForm((f) => ({ ...f, specificRole: e.target.value }))} className={inputCls} placeholder="Electrician grade 2" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Headcount</label>
                  <input type="number" min={1} value={form.headcount} onChange={(e) => setForm((f) => ({ ...f, headcount: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Destination country</label>
                  <select value={form.destinationCountry} onChange={(e) => setForm((f) => ({ ...f, destinationCountry: e.target.value }))} className={inputCls}>
                    <option value="">—</option>
                    {ref.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Employer</label>
                  <select value={form.employerId} onChange={(e) => setForm((f) => ({ ...f, employerId: e.target.value }))} className={inputCls}>
                    <option value="">—</option>
                    {lookup.employers.map((x) => <option key={x.id} value={x.id}>{x.company_name}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Employment promoter</label>
                  <select value={form.oepId} onChange={(e) => setForm((f) => ({ ...f, oepId: e.target.value }))} className={inputCls}>
                    <option value="">—</option>
                    {lookup.oeps.map((x) => <option key={x.id} value={x.id}>{x.company_name}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Salary min</label>
                  <input type="number" value={form.salaryMin} onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Salary max</label>
                  <input type="number" value={form.salaryMax} onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Currency</label>
                  <select value={form.salaryCurrency} onChange={(e) => setForm((f) => ({ ...f, salaryCurrency: e.target.value }))} className={inputCls}>
                    <option value="">—</option>
                    {ref.currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Contract (months)</label>
                  <input type="number" value={form.contractMonths} onChange={(e) => setForm((f) => ({ ...f, contractMonths: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Target date</label>
                  <input type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Requirements</label>
                <textarea value={form.requirements} onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))} rows={3} className={`${inputCls} resize-none`} /></div>
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

export default function OrdersPage() {
  return <Suspense fallback={<div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>}><OrdersInner /></Suspense>
}
