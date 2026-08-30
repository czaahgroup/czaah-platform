'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

const SEV: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-surface-container-lowest text-on-surface-variant/70 border-outline-variant/10',
}

export default function RiskRadarPage() {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summarizing, setSummarizing] = useState(false)

  const load = (withSummary = false) => {
    if (withSummary) setSummarizing(true); else setLoading(true)
    setError(null)
    fetch(`/api/crm/risk-radar${withSummary ? '?summary=1' : ''}`)
      .then((r) => r.ok ? r.json() : r.json().then((j) => Promise.reject(new Error(j.error || 'Failed'))))
      .then(setD).catch((e) => setError(e.message))
      .finally(() => { setLoading(false); setSummarizing(false) })
  }
  useEffect(() => { load(false) }, [])

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Scanning…</div>
  if (error) return <div className="text-red-400 py-12 text-center text-sm">{error}</div>

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Risk Radar</h1>
        <div className="flex gap-2">
          <button onClick={() => load(false)} className="text-xs text-on-surface-variant border border-outline-variant/20 px-3 py-1.5">Rescan</button>
          {d.aiAvailable && <button onClick={() => load(true)} disabled={summarizing} className="text-xs text-primary border border-primary/30 px-3 py-1.5 disabled:opacity-40">{summarizing ? 'Summarising…' : '✦ AI summary'}</button>}
        </div>
      </div>
      <p className="text-sm text-on-surface-variant mb-6">Deals, projects and trades that are overdue, stalled or inconsistent.</p>

      <div className="flex gap-3 mb-5 text-sm">
        <span className="text-red-400">{d.counts.high} high</span>
        <span className="text-amber-400">{d.counts.medium} medium</span>
        <span className="text-on-surface-variant/60">{d.counts.low} low</span>
      </div>

      {d.summary && (
        <div className="bg-surface-container-low border border-primary/20 p-4 mb-5">
          <p className="text-[10px] uppercase tracking-wide text-primary/70 mb-1">AI summary</p>
          <p className="text-sm text-on-surface whitespace-pre-wrap">{d.summary}</p>
        </div>
      )}

      {d.alerts.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center text-on-surface-variant text-sm">Nothing needs attention. 🎉</div>
      ) : (
        <div className="space-y-2">
          {d.alerts.map((a: any, i: number) => (
            <div key={i} className={`border px-4 py-3 flex items-start gap-3 ${SEV[a.severity]}`}>
              <span className="text-[10px] uppercase tracking-wide flex-none pt-0.5 w-16">{a.category.split(' ')[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-on-surface">{a.message}</p>
                <p className="text-[11px] opacity-70 mt-0.5">{a.category}</p>
              </div>
              {a.href && <Link href={a.href} className="text-xs underline flex-none">Open</Link>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
