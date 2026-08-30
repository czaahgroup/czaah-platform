'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STAGE_ORDER = ['sourced', 'shortlisted', 'interview', 'selected', 'offer', 'medical', 'visa', 'ticketing', 'deployed', 'rejected', 'withdrawn']
const STAGE_LABEL: Record<string, string> = {
  sourced: 'Sourced', shortlisted: 'Shortlisted', interview: 'Interview', selected: 'Selected',
  offer: 'Offer', medical: 'Medical', visa: 'Visa', ticketing: 'Ticketing', deployed: 'Deployed',
  rejected: 'Rejected', withdrawn: 'Withdrawn',
}

export default function RecruitmentOverviewPage() {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recruitment/overview').then((r) => r.ok ? r.json() : null).then(setD).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (!d) return <div className="text-red-400 py-12 text-center text-sm">Could not load the recruitment overview.</div>

  const kpis = [
    { label: 'Open orders', value: d.openOrders, href: '/admin/recruitment/orders?status=open' },
    { label: 'Seats to fill', value: d.openSeats, href: '/admin/recruitment/orders' },
    { label: 'In pipeline', value: d.activePipeline, href: '/admin/recruitment/orders' },
    { label: 'Deployed (30d)', value: d.deployedLast30d, href: '/admin/recruitment/orders?status=filled' },
    { label: 'Filled orders', value: d.filledOrders, href: '/admin/recruitment/orders?status=filled' },
    { label: 'Candidates', value: d.candidates, href: '/admin/workforce' },
  ]
  const max = Math.max(1, ...STAGE_ORDER.map((s) => d.byStage?.[s] || 0))

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Recruitment</h1>
        <Link href="/admin/recruitment/orders" className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors">Job orders →</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="bg-surface-container-low border border-outline-variant/10 hover:border-primary/40 transition-colors p-4 block">
            <div className="text-2xl font-semibold tabular-nums text-on-surface">{k.value ?? 0}</div>
            <div className="text-[11px] uppercase tracking-wide text-on-surface-variant/60 mt-1">{k.label}</div>
          </Link>
        ))}
      </div>

      <div className="bg-surface-container-low border border-outline-variant/10 p-5">
        <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Candidates by pipeline stage</h2>
        <div className="space-y-2">
          {STAGE_ORDER.map((s) => (
            <div key={s} className="flex items-center gap-3 text-xs">
              <span className="w-20 flex-none text-on-surface-variant/70">{STAGE_LABEL[s]}</span>
              <div className="flex-1 bg-surface-container-lowest h-2">
                <div className={`h-2 ${s === 'deployed' ? 'bg-emerald-500/70' : ['rejected', 'withdrawn'].includes(s) ? 'bg-red-500/50' : 'bg-primary/70'}`} style={{ width: `${((d.byStage?.[s] || 0) / max) * 100}%` }} />
              </div>
              <span className="w-6 flex-none text-right tabular-nums text-on-surface-variant">{d.byStage?.[s] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
