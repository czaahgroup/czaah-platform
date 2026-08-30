'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

export default function DuplicatesPage() {
  const [type, setType] = useState<'contact' | 'company'>('contact')
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/crm/duplicates?type=${type}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setGroups(j.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }, [type])

  useEffect(() => { load() }, [load])

  async function act(body: any, key: string) {
    setBusy(key); setError(null)
    try {
      const res = await fetch('/api/crm/duplicates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ...body }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Action failed')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally { setBusy(null) }
  }

  async function merge(keepId: string, mergeId: string, keepLabel: string, dropLabel: string) {
    if (!confirm(`Merge "${dropLabel}" into "${keepLabel}"?\n\nAll notes, tasks, documents, links and references move to "${keepLabel}", then "${dropLabel}" is permanently deleted. This cannot be undone.`)) return
    await act({ keepId, mergeId }, `${keepId}:${mergeId}`)
  }

  const href = (id: string) => `/admin/crm/${type === 'company' ? 'companies' : 'contacts'}/${id}`

  return (
    <div className="max-w-3xl">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-1">Duplicates</h1>
      <p className="text-sm text-on-surface-variant mb-6">Records that match on name, email, phone or domain. Merge keeps one and folds the other into it.</p>

      <div className="flex gap-2 mb-5">
        {(['contact', 'company'] as const).map((t) => (
          <button key={t} onClick={() => setType(t)} className={`px-4 py-1.5 text-sm border ${type === t ? 'border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant'}`}>
            {t === 'contact' ? 'Contacts' : 'Companies'}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Scanning…</div>
      ) : groups.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center text-on-surface-variant text-sm">No duplicates found. 🎉</div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-on-surface-variant/50">{groups.length} possible duplicate pair{groups.length === 1 ? '' : 's'}</p>
          {groups.map((g, gi) => {
            const [a, b] = g.records
            if (!a || !b) return null
            const k = `${a.id}:${b.id}`
            return (
              <div key={gi} className="bg-surface-container-low border border-outline-variant/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 ${g.strength === 'high' ? 'bg-amber-500/15 text-amber-400' : 'bg-surface-container-lowest text-on-surface-variant/60'}`}>{g.strength}</span>
                  <span className="text-xs text-on-surface-variant/60">{g.reasons.join(' · ')}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[a, b].map((rec, ri) => {
                    const other = ri === 0 ? b : a
                    return (
                      <div key={rec.id} className="border border-outline-variant/10 p-3">
                        <Link href={href(rec.id)} className="text-sm text-on-surface font-medium hover:text-primary">{rec.name}</Link>
                        <div className="text-[11px] text-on-surface-variant/60 mt-1 space-y-0.5">
                          {type === 'contact' ? (
                            <>
                              {rec.email && <div className="font-mono">{rec.email}</div>}
                              {rec.phone && <div>{rec.phone}</div>}
                              <div>{rec.type}{rec.company ? ` · ${rec.company}` : ''}</div>
                            </>
                          ) : (
                            <>
                              {rec.domain && <div className="font-mono">{rec.domain}</div>}
                              <div>{rec.stage}</div>
                            </>
                          )}
                          <div className="text-on-surface-variant/40">added {new Date(rec.createdAt).toLocaleDateString()}</div>
                        </div>
                        <button
                          onClick={() => merge(rec.id, other.id, rec.name, other.name)}
                          disabled={busy === k}
                          className="mt-3 w-full text-xs bg-primary/10 text-primary hover:bg-primary/20 py-1.5 disabled:opacity-40">
                          Keep this, merge the other in
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-end mt-3">
                  <button onClick={() => act({ idA: a.id, idB: b.id, dismiss: true }, k)} disabled={busy === k} className="text-xs text-on-surface-variant/50 hover:text-on-surface-variant">Not a duplicate</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
