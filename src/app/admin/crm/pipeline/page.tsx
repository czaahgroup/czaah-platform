'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'

const COLUMNS = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'more_info_required', label: 'More info' },
  { key: 'approved', label: 'Approved' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
]
const MOVES = COLUMNS.map((c) => c.key)

function parseValue(v: unknown): number {
  if (!v) return 0
  const n = Number(String(v).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export default function PipelinePage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/partner-opportunities')
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setRows((j.data || []).filter((o: any) => !['rejected', 'archived'].includes(o.status)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function move(id: string, status: string) {
    setMoving(id)
    setRows((r) => r.map((o) => (o.id === id ? { ...o, status } : o)))
    try {
      const res = await fetch(`/api/admin/partner-opportunities/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      })
      if (!res.ok) await load()
    } finally { setMoving(null) }
  }

  const byStatus: Record<string, any[]> = {}
  for (const o of rows) (byStatus[o.status] ||= []).push(o)
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(n >= 1e6 ? 1 : 0)}${n >= 1e6 ? 'M' : 'k'}` : n ? `$${n}` : '—'

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-1">Pipeline</h1>
      <p className="text-sm text-on-surface-variant mb-6">{rows.length} open opportunit{rows.length === 1 ? 'y' : 'ies'}</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 mb-4 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const items = byStatus[col.key] || []
            const total = items.reduce((s, o) => s + parseValue(o.estimated_value), 0)
            return (
              <div key={col.key} className="flex-none w-64">
                <div className="flex items-center justify-between px-1 mb-1">
                  <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60">{col.label}</h2>
                  <span className="text-xs text-on-surface-variant/40 tabular-nums">{items.length}</span>
                </div>
                <p className="text-[11px] text-primary/80 px-1 mb-2 tabular-nums">{fmt(total)}</p>
                <div className="space-y-2">
                  {items.map((o) => (
                    <div key={o.id} className={`bg-surface-container-low border border-outline-variant/10 p-3 ${moving === o.id ? 'opacity-50' : ''}`}>
                      <p className="text-sm text-on-surface font-medium truncate">{o.title}</p>
                      <p className="text-[11px] text-on-surface-variant/60 font-mono mt-0.5">{o.reference_number}</p>
                      <p className="text-[11px] text-on-surface-variant/70 mt-1 truncate">
                        {o.partners?.profiles?.full_name || 'Partner'}
                        {o.estimated_value ? ` · ${o.estimated_value}` : ''}
                      </p>
                      <select
                        value={o.status}
                        onChange={(ev) => move(o.id, ev.target.value)}
                        className="mt-2 w-full bg-surface-container-lowest border border-outline-variant/10 text-[11px] text-on-surface-variant px-2 py-1"
                      >
                        {MOVES.map((s) => <option key={s} value={s}>{COLUMNS.find((c) => c.key === s)?.label}</option>)}
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
    </div>
  )
}
