'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const KIND_STYLE: Record<string, string> = {
  contact: 'bg-blue-500/15 text-blue-300',
  company: 'bg-primary/20 text-primary',
  enquiry: 'bg-amber-500/15 text-amber-300',
  opportunity: 'bg-green-500/15 text-green-300',
}

export default function CrmSearchPage() {
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { const t = setTimeout(() => setQd(q.trim()), 250); return () => clearTimeout(t) }, [q])

  const run = useCallback(async () => {
    if (qd.length < 2) { setResults([]); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/crm/search?q=${encodeURIComponent(qd)}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Search failed')
      setResults(j.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [qd])

  useEffect(() => { run() }, [run])

  const byKind: Record<string, any[]> = {}
  for (const r of results) (byKind[r.kind] ||= []).push(r)

  return (
    <div className="max-w-2xl">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-4">Search</h1>

      <input
        value={q} onChange={(e) => setQ(e.target.value)} autoFocus
        placeholder="Search contacts, companies, enquiries, opportunities…"
        className="w-full bg-surface-container-lowest border border-outline-variant/10 px-4 py-3 text-on-surface text-sm mb-6"
      />

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 mb-4 text-sm text-red-400">{error}</div>}

      {loading && <p className="text-on-surface-variant/50 text-sm">Searching…</p>}
      {!loading && qd.length >= 2 && results.length === 0 && (
        <p className="text-on-surface-variant/60 text-sm">No matches for “{qd}”.</p>
      )}

      {['contact', 'company', 'enquiry', 'opportunity'].filter((k) => byKind[k]?.length).map((k) => (
        <div key={k} className="mb-5">
          <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/50 mb-2">{k}s</h2>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {byKind[k].map((r) => (
              <Link key={`${r.kind}-${r.id}`} href={r.href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-lowest/40 transition-colors">
                <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 flex-none ${KIND_STYLE[r.kind]}`}>{r.kind}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-on-surface truncate">{r.label}</p>
                  {r.sub && <p className="text-[11px] text-on-surface-variant/60 truncate">{r.sub}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
