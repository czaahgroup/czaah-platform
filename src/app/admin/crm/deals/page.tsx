'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const COLUMNS = [
  { key: 'lead', label: 'Lead' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'due_diligence', label: 'Due diligence' },
  { key: 'agreement', label: 'Agreement' },
  { key: 'closed_won', label: 'Won' },
  { key: 'closed_lost', label: 'Lost' },
]
const STAGES = COLUMNS.map((c) => c.key)
const KINDS = ['property_sale', 'property_rental', 'investment', 'advisory', 'other']
const KIND_LABEL: Record<string, string> = {
  property_sale: 'Property sale', property_rental: 'Property rental', investment: 'Investment',
  advisory: 'Advisory', other: 'Other',
}

function fmt(n: number) {
  if (!n) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return String(n)
}

export default function DealsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [lookup, setLookup] = useState<any>({ properties: [], investments: [], companies: [], staff: [] })
  const [ref, setRef] = useState<any>({ currencies: [] })
  const [form, setForm] = useState<any>({ title: '', kind: 'property_sale', propertyId: '', investmentId: '', companyId: '', valueAmount: '', currency: '', expectedClose: '', probability: 20 })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deals?page=0')
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setRows(j.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/deals/lookup').then((r) => r.ok && r.json()).then((j) => j && setLookup(j))
    fetch('/api/reference').then((r) => r.ok && r.json()).then((j) => j && setRef({ currencies: j.currencies || [] }))
  }, [])

  async function move(id: string, stage: string) {
    setMoving(id)
    setRows((r) => r.map((d) => (d.id === id ? { ...d, stage } : d)))
    try {
      const res = await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) })
      if (!res.ok) await load()
    } finally { setMoving(null) }
  }

  async function create() {
    if (!form.title.trim()) { setError('A deal title is required.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not create')
      setShowNew(false)
      setForm({ title: '', kind: 'property_sale', propertyId: '', investmentId: '', companyId: '', valueAmount: '', currency: '', expectedClose: '', probability: 20 })
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally { setSaving(false) }
  }

  const byStage: Record<string, any[]> = {}
  for (const d of rows) (byStage[d.stage] ||= []).push(d)
  const open = rows.filter((d) => !['closed_won', 'closed_lost'].includes(d.stage))
  const weighted = open.reduce((s, d) => s + ((Number(d.value_amount) || 0) * (d.probability || 0)) / 100, 0)
  const inputCls = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Deals</h1>
        <button onClick={() => setShowNew(true)} className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors">+ New Deal</button>
      </div>
      <p className="text-sm text-on-surface-variant mb-6">{open.length} open · weighted pipeline ≈ {fmt(Math.round(weighted))}</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 mb-4 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const items = byStage[col.key] || []
            const total = items.reduce((s, d) => s + (Number(d.value_amount) || 0), 0)
            return (
              <div key={col.key} className="flex-none w-64">
                <div className="flex items-center justify-between px-1 mb-1">
                  <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60">{col.label}</h2>
                  <span className="text-xs text-on-surface-variant/40 tabular-nums">{items.length}</span>
                </div>
                <p className="text-[11px] text-primary/80 px-1 mb-2 tabular-nums">{fmt(total)}</p>
                <div className="space-y-2">
                  {items.map((d) => (
                    <div key={d.id} className={`bg-surface-container-low border border-outline-variant/10 p-3 ${moving === d.id ? 'opacity-50' : ''}`}>
                      <Link href={`/admin/crm/deals/${d.id}`} className="text-sm text-on-surface font-medium hover:text-primary truncate block">{d.title}</Link>
                      <p className="text-[11px] text-on-surface-variant/60 font-mono mt-0.5">{d.reference}</p>
                      <p className="text-[11px] text-on-surface-variant/70 mt-1 truncate">
                        {d.company?.name || d.property?.title || d.investment?.title || KIND_LABEL[d.kind]}
                        {d.value_amount ? ` · ${fmt(Number(d.value_amount))} ${d.currency || ''}` : ''}
                      </p>
                      <select value={d.stage} onChange={(e) => move(d.id, e.target.value)} className="mt-2 w-full bg-surface-container-lowest border border-outline-variant/10 text-[11px] text-on-surface-variant px-2 py-1">
                        {STAGES.map((s) => <option key={s} value={s}>{COLUMNS.find((c) => c.key === s)?.label}</option>)}
                      </select>
                    </div>
                  ))}
                  {!items.length && <p className="text-[11px] text-on-surface-variant/30 px-1 py-4 text-center">—</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowNew(false)}>
          <div className="bg-surface-container-low border border-outline-variant/10 w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-5">New Deal</h2>
            <div className="space-y-3">
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} autoFocus /></div>
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Type</label>
                <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} className={inputCls}>
                  {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select></div>
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Property</label>
                <select value={form.propertyId} onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value }))} className={inputCls}>
                  <option value="">—</option>
                  {lookup.properties.map((x) => <option key={x.id} value={x.id}>{x.title}{x.city ? ` (${x.city})` : ''}</option>)}
                </select></div>
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Investment</label>
                <select value={form.investmentId} onChange={(e) => setForm((f) => ({ ...f, investmentId: e.target.value }))} className={inputCls}>
                  <option value="">—</option>
                  {lookup.investments.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                </select></div>
              <div><label className="block text-xs text-on-surface-variant mb-1.5">Company</label>
                <select value={form.companyId} onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))} className={inputCls}>
                  <option value="">—</option>
                  {lookup.companies.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><label className="block text-xs text-on-surface-variant mb-1.5">Value</label>
                  <input type="number" value={form.valueAmount} onChange={(e) => setForm((f) => ({ ...f, valueAmount: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className={inputCls}>
                    <option value="">—</option>
                    {ref.currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Expected close</label>
                  <input type="date" value={form.expectedClose} onChange={(e) => setForm((f) => ({ ...f, expectedClose: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1.5">Probability %</label>
                  <input type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))} className={inputCls} /></div>
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
