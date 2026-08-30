'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const TYPES = ['residential', 'commercial', 'industrial', 'infrastructure', 'mixed_use', 'fit_out', 'other']
const TYPE_LABEL: Record<string, string> = {
  residential: 'Residential', commercial: 'Commercial', industrial: 'Industrial',
  infrastructure: 'Infrastructure', mixed_use: 'Mixed use', fit_out: 'Fit-out', other: 'Other',
}
const STATUS = ['planning', 'tendering', 'awarded', 'in_progress', 'on_hold', 'completed', 'handover', 'cancelled']
const STATUS_LABEL: Record<string, string> = {
  planning: 'Planning', tendering: 'Tendering', awarded: 'Awarded', in_progress: 'In progress',
  on_hold: 'On hold', completed: 'Completed', handover: 'Handover', cancelled: 'Cancelled',
}
const STATUS_CLS: Record<string, string> = {
  in_progress: 'text-emerald-400', on_hold: 'text-amber-400', completed: 'text-on-surface-variant',
  handover: 'text-on-surface-variant', cancelled: 'text-red-400',
}

function ProjectsInner() {
  const sp = useSearchParams()
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState(sp.get('status') || '')
  const [type, setType] = useState('')
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [lookup, setLookup] = useState<any>({ companies: [], deals: [], staff: [] })
  const [ref, setRef] = useState<any>({ countries: [], currencies: [] })
  const [form, setForm] = useState<any>({ name: '', projectType: 'residential', clientCompanyId: '', dealId: '', siteLocation: '', country: '', contractValue: '', budget: '', currency: '', startDate: '', targetCompletion: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { const t = setTimeout(() => setQd(q.trim()), 300); return () => clearTimeout(t) }, [q])
  useEffect(() => {
    fetch('/api/construction/lookup').then((r) => r.ok && r.json()).then((j) => j && setLookup(j))
    fetch('/api/reference').then((r) => r.ok && r.json()).then((j) => j && setRef({ countries: j.countries || [], currencies: j.currencies || [] }))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (status) params.set('status', status)
      if (type) params.set('type', type)
      if (qd) params.set('q', qd)
      const res = await fetch(`/api/construction/projects?${params}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setRows(j.data); setTotal(j.total); setHasMore(j.hasMore)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [page, status, type, qd])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [status, type, qd])

  async function create() {
    if (!form.name.trim()) { setError('A project name is required.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/construction/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not create')
      setShowNew(false)
      setForm({ name: '', projectType: 'residential', clientCompanyId: '', dealId: '', siteLocation: '', country: '', contractValue: '', budget: '', currency: '', startDate: '', targetCompletion: '', description: '' })
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Projects</h1>
        <button onClick={() => setShowNew(true)} className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors">+ New Project</button>
      </div>
      <p className="text-sm text-on-surface-variant mb-6">{total.toLocaleString()} project{total === 1 ? '' : 's'}</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4 text-sm text-red-400">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, reference, site…" className={`${inputCls} max-w-xs`} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm">
          <option value="">All statuses</option>
          {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center text-on-surface-variant text-sm">No projects match.</div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  {['Reference', 'Name', 'Type', 'Client', 'Location', 'Progress', 'Target', 'Status'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest/40 transition-colors">
                    <td className="px-5 py-3"><Link href={`/admin/construction/projects/${r.id}`} className="text-primary font-mono text-xs hover:underline">{r.reference}</Link></td>
                    <td className="px-5 py-3 text-on-surface">{r.name}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{TYPE_LABEL[r.project_type]}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{r.client?.name || '—'}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{r.site_location || r.country || '—'}</td>
                    <td className="px-5 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface-container-lowest h-1.5"><div className="bg-primary/70 h-1.5" style={{ width: `${r.progress_pct}%` }} /></div>
                        <span className="text-[11px] text-on-surface-variant tabular-nums">{r.progress_pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant text-xs">{r.target_completion || '—'}</td>
                    <td className={`px-5 py-3 text-xs ${STATUS_CLS[r.status] || 'text-on-surface-variant'}`}>{STATUS_LABEL[r.status]}</td>
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
            <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-5">New Project</h2>
            <div className="space-y-3">
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Type</label>
                  <select value={form.projectType} onChange={(e) => setForm((f) => ({ ...f, projectType: e.target.value }))} className={inputCls}>
                    {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Country</label>
                  <select value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={inputCls}>
                    <option value="">—</option>
                    {ref.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Site location</label>
                <input value={form.siteLocation} onChange={(e) => setForm((f) => ({ ...f, siteLocation: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Client company</label>
                  <select value={form.clientCompanyId} onChange={(e) => setForm((f) => ({ ...f, clientCompanyId: e.target.value }))} className={inputCls}>
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
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Contract value</label>
                  <input type="number" value={form.contractValue} onChange={(e) => setForm((f) => ({ ...f, contractValue: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Budget</label>
                  <input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className={inputCls}>
                    <option value="">—</option>
                    {ref.currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Start date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Target completion</label>
                  <input type="date" value={form.targetCompletion} onChange={(e) => setForm((f) => ({ ...f, targetCompletion: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className={`${inputCls} resize-none`} /></div>
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

export default function ProjectsPage() {
  return <Suspense fallback={<div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>}><ProjectsInner /></Suspense>
}
