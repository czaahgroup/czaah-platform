'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const COLUMNS = [
  { key: 'submitted', label: 'New' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'active', label: 'Active' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'resolved', label: 'Resolved' },
]
const MOVES = COLUMNS.map((c) => c.key)

export default function LeadBoardPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/enquiries')
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setRows((j.data || []).filter((e: any) => e.status !== 'archived'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function move(id: string, status: string) {
    setMoving(id)
    setRows((r) => r.map((e) => (e.id === id ? { ...e, status } : e)))
    try {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      })
      if (!res.ok) { await load() }
    } finally { setMoving(null) }
  }

  const byStatus: Record<string, any[]> = {}
  for (const e of rows) (byStatus[e.status] ||= []).push(e)

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-1">Lead Board</h1>
      <p className="text-sm text-on-surface-variant mb-6">{rows.length} live enquir{rows.length === 1 ? 'y' : 'ies'}</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 mb-4 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex-none w-64">
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60">{col.label}</h2>
                <span className="text-xs text-on-surface-variant/40 tabular-nums">{byStatus[col.key]?.length || 0}</span>
              </div>
              <div className="space-y-2">
                {(byStatus[col.key] || []).map((e) => (
                  <div key={e.id} className={`bg-surface-container-low border border-outline-variant/10 p-3 ${moving === e.id ? 'opacity-50' : ''}`}>
                    <Link href={`/admin/enquiries/${e.id}`} className="text-sm text-on-surface font-medium hover:text-primary block truncate">
                      {e.product_name || 'Enquiry'}
                    </Link>
                    <p className="text-[11px] text-on-surface-variant/60 font-mono mt-0.5">{e.reference_number}</p>
                    <p className="text-[11px] text-on-surface-variant/70 mt-1 truncate">
                      {e.profiles?.full_name || 'Unknown'}{e.profiles?.company_name ? ` · ${e.profiles.company_name}` : ''}
                    </p>
                    <select
                      value={e.status}
                      onChange={(ev) => move(e.id, ev.target.value)}
                      className="mt-2 w-full bg-surface-container-lowest border border-outline-variant/10 text-[11px] text-on-surface-variant px-2 py-1"
                    >
                      {MOVES.map((s) => <option key={s} value={s}>{COLUMNS.find((c) => c.key === s)?.label}</option>)}
                    </select>
                  </div>
                ))}
                {!byStatus[col.key]?.length && <p className="text-[11px] text-on-surface-variant/30 px-1 py-4 text-center">—</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
