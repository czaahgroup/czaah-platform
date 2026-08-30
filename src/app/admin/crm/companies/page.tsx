'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const STAGES = ['new', 'engaged', 'qualified', 'active', 'dormant', 'lost']

export default function CrmCompaniesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState('')
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', domain: '', country: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { const t = setTimeout(() => setQd(q.trim()), 300); return () => clearTimeout(t) }, [q])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (stage) params.set('stage', stage)
      if (qd) params.set('q', qd)
      const res = await fetch(`/api/crm/companies?${params}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setRows(j.data); setTotal(j.total); setHasMore(j.hasMore)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [page, stage, qd])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [stage, qd])

  async function create() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/crm/companies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not create')
      setShowNew(false); setForm({ name: '', domain: '', country: '' }); await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Companies</h1>
        <button onClick={() => setShowNew(true)} className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors">+ New Company</button>
      </div>
      <p className="text-sm text-on-surface-variant mb-6">{total.toLocaleString()} compan{total === 1 ? 'y' : 'ies'}</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4 text-sm text-red-400">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or domain…" className={`${inputCls} max-w-xs`} />
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm">
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center text-on-surface-variant text-sm">No companies match.</div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  {['Name', 'Sector', 'Country', 'Contacts', 'Stage'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((co) => (
                  <tr key={co.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/crm/companies/${co.id}`} className="text-on-surface font-medium hover:text-primary transition-colors">{co.name}</Link>
                      {co.domain && <div className="text-on-surface-variant/60 text-xs font-mono">{co.domain}</div>}
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{co.sector?.name || '—'}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{co.country || '—'}</td>
                    <td className="px-5 py-3 text-on-surface-variant tabular-nums">{co.contactCount}</td>
                    <td className="px-5 py-3 text-on-surface-variant text-xs">{co.stage}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowNew(false)}>
          <div className="bg-surface-container-low border border-outline-variant/10 w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-5">New Company</h2>
            <div className="space-y-3">
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Domain</label>
                  <input value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="acme.com" className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Country</label>
                  <input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={inputCls} /></div>
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
