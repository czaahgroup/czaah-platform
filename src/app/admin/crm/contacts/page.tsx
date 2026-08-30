'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const TYPES = ['lead', 'prospect', 'client', 'partner', 'vendor', 'other']
const STAGES = ['new', 'engaged', 'qualified', 'active', 'dormant', 'lost']

const TYPE_STYLE: Record<string, string> = {
  lead: 'bg-blue-500/15 text-blue-300',
  prospect: 'bg-amber-500/15 text-amber-300',
  client: 'bg-green-500/15 text-green-300',
  partner: 'bg-primary/20 text-primary',
  vendor: 'bg-purple-500/15 text-purple-300',
  other: 'bg-neutral-500/15 text-neutral-300',
}

export default function CrmContactsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState('')
  const [stage, setStage] = useState('')
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', title: '', type: 'lead' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (type) params.set('type', type)
      if (stage) params.set('stage', stage)
      if (qDebounced) params.set('q', qDebounced)
      const res = await fetch(`/api/crm/contacts?${params}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setRows(j.data)
      setTotal(j.total)
      setHasMore(j.hasMore)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [page, type, stage, qDebounced])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [type, stage, qDebounced])

  async function create() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not create contact')
      setShowNew(false)
      setForm({ name: '', email: '', phone: '', title: '', type: 'lead' })
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm'
  const selCls = 'bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Contacts</h1>
        <button onClick={() => setShowNew(true)} className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors">
          + New Contact
        </button>
      </div>
      <p className="text-sm text-on-surface-variant mb-6">{total.toLocaleString()} contact{total === 1 ? '' : 's'}</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className={`${inputCls} max-w-xs`} />
        <select value={type} onChange={(e) => setType(e.target.value)} className={selCls}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={selCls}>
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center text-on-surface-variant text-sm">
          No contacts match.
        </div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  {['Name', 'Company', 'Type', 'Stage', 'Last activity'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/crm/contacts/${c.id}`} className="text-on-surface font-medium hover:text-primary transition-colors">{c.name}</Link>
                      {c.email && <div className="text-on-surface-variant/60 text-xs font-mono">{c.email}</div>}
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{c.company?.name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 ${TYPE_STYLE[c.type] || TYPE_STYLE.other}`}>{c.type}</span>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant text-xs">{c.stage}</td>
                    <td className="px-5 py-3 text-on-surface-variant/60 text-xs">
                      {c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="text-primary disabled:opacity-30 disabled:cursor-default px-2 py-1">← Previous</button>
          <span className="text-on-surface-variant/50 text-xs">Page {page + 1}</span>
          <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className="text-primary disabled:opacity-30 disabled:cursor-default px-2 py-1">Next →</button>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowNew(false)}>
          <div className="bg-surface-container-low border border-outline-variant/10 w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-5">New Contact</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Email</label>
                  <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Title</label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={`${inputCls}`}>
                    {TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface border border-outline-variant/10 transition-colors">Cancel</button>
              <button onClick={create} disabled={saving} className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
