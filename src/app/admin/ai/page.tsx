'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

const HREF: Record<string, (id: string) => string> = {
  contact: (id) => `/admin/crm/contacts/${id}`,
  company: (id) => `/admin/crm/companies/${id}`,
  deal: (id) => `/admin/crm/deals/${id}`,
  construction_project: (id) => `/admin/construction/projects/${id}`,
  commodity_trade: (id) => `/admin/trading/trades/${id}`,
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function AiAdminPage() {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/ai-status')
      .then((r) => r.ok ? r.json() : r.json().then((j) => Promise.reject(new Error(j.error || 'Failed'))))
      .then(setD).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (error) return <div className="text-red-400 py-12 text-center text-sm">{error}</div>

  return (
    <div className="max-w-3xl">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-1">AI</h1>
      <p className="text-sm text-on-surface-variant mb-6">The Phase-2 AI layer. Every AI action is logged below.</p>

      <div className={`border p-4 mb-6 ${d.configured ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${d.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-sm text-on-surface">{d.configured ? 'Workers AI is configured' : 'Workers AI is not configured'}</span>
        </div>
        {!d.configured && (
          <p className="text-xs text-on-surface-variant/70 mt-2">
            Add <span className="font-mono">CLOUDFLARE_ACCOUNT_ID</span> and <span className="font-mono">CLOUDFLARE_AI_API_TOKEN</span> (Workers AI permission) as Worker secrets to switch on AI briefings across the CRM and modules. Features degrade gracefully until then.
          </p>
        )}
        {d.configured && <p className="text-xs text-on-surface-variant/60 mt-2 font-mono">{d.model}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="OK (30d)" value={d.stats.ok} />
        <Stat label="Errors (30d)" value={d.stats.error} />
        <Stat label="Tokens in (30d)" value={d.stats.tokensIn.toLocaleString()} />
        <Stat label="Tokens out (30d)" value={d.stats.tokensOut.toLocaleString()} />
      </div>

      <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Recent AI actions</h2>
      <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
        {d.recent.length === 0 && <p className="text-on-surface-variant/50 text-sm text-center py-8">No AI actions yet.</p>}
        {d.recent.map((r: any) => {
          const href = r.relatedType && HREF[r.relatedType] && r.relatedId ? HREF[r.relatedType](r.relatedId) : null
          return (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className={`text-[10px] uppercase px-1.5 py-0.5 flex-none ${r.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : r.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{r.status}</span>
              <span className="text-on-surface flex-none">{r.actionType}</span>
              {href ? <Link href={href} className="text-on-surface-variant/70 hover:text-primary truncate flex-1">{r.relatedType}</Link> : <span className="flex-1 text-on-surface-variant/50">{r.relatedType || '—'}</span>}
              <span className="text-[11px] text-on-surface-variant/40 flex-none tabular-nums">{r.tokensIn + r.tokensOut || ''}</span>
              <span className="text-[11px] text-on-surface-variant/40 flex-none">{r.actor} · {timeAgo(r.at)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }: any) {
  return (
    <div className="bg-surface-container-low border border-outline-variant/10 p-3">
      <div className="text-xl font-semibold tabular-nums text-on-surface">{value ?? 0}</div>
      <div className="text-[10px] uppercase tracking-wide text-on-surface-variant/50 mt-0.5">{label}</div>
    </div>
  )
}
