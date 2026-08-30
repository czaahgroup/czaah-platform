'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

function Spark({ data, w = 320, h = 64 }: { data: { date: string; count: number }[]; w?: number; h?: number }) {
  if (!data?.length) return null
  const max = Math.max(1, ...data.map((d) => d.count))
  const step = w / (data.length - 1)
  const pts = data.map((d, i) => `${i * step},${h - (d.count / max) * (h - 8) - 4}`).join(' ')
  const area = `0,${h} ${pts} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: h }}>
      <polygon points={area} fill="var(--color-primary, #c9a84c)" opacity="0.12" />
      <polyline points={pts} fill="none" stroke="var(--color-primary, #c9a84c)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={w} cy={h - (data[data.length - 1].count / max) * (h - 8) - 4} r="3" fill="var(--color-primary, #c9a84c)" />
    </svg>
  )
}

const STAGE_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', more_info_required: 'More info',
  approved: 'Approved', in_progress: 'In progress',
}

export default function CrmDashboardPage() {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/overview').then((r) => r.ok ? r.json() : null).then(setD).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (!d) return <div className="text-red-400 py-12 text-center text-sm">Could not load the dashboard.</div>

  const kpis = [
    { label: 'Clients', value: d.clients, href: '/admin/crm/contacts?type=client' },
    { label: 'Companies', value: d.companies, href: '/admin/crm/companies' },
    { label: 'Active leads', value: d.activeLeads, href: '/admin/crm/leads' },
    { label: 'Open opportunities', value: d.openOpportunities, href: '/admin/crm/pipeline' },
    { label: 'Tasks due today', value: d.tasksDueToday, href: '/admin/crm/tasks', alert: d.tasksDueToday > 0 },
    { label: 'Overdue tasks', value: d.tasksOverdue, href: '/admin/crm/tasks', alert: d.tasksOverdue > 0 },
    { label: 'New leads (7d)', value: d.newLeads7d, href: '/admin/crm/leads' },
    { label: 'Conversion', value: `${d.conversionRate}%`, href: '/admin/enquiries' },
  ]

  const pipeMax = Math.max(1, ...Object.values(d.pipelineByStage || {}))

  return (
    <div className="max-w-4xl">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-6">CRM Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="bg-surface-container-low border border-outline-variant/10 hover:border-primary/40 transition-colors p-4 block">
            <div className={`text-2xl font-semibold tabular-nums ${k.alert ? 'text-amber-400' : 'text-on-surface'}`}>{k.value ?? 0}</div>
            <div className="text-[11px] uppercase tracking-wide text-on-surface-variant/60 mt-1">{k.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-surface-container-low border border-outline-variant/10 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60">Leads · last 14 days</h2>
            <span className="text-xs text-on-surface-variant/40">{d.leadsSeries?.reduce((s: number, x: any) => s + x.count, 0)} total</span>
          </div>
          <Spark data={d.leadsSeries} />
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 p-5">
          <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Pipeline by stage</h2>
          <div className="space-y-2">
            {Object.keys(STAGE_LABEL).map((s) => (
              <div key={s} className="flex items-center gap-3 text-xs">
                <span className="w-20 flex-none text-on-surface-variant/70">{STAGE_LABEL[s]}</span>
                <div className="flex-1 bg-surface-container-lowest h-2">
                  <div className="bg-primary/70 h-2" style={{ width: `${((d.pipelineByStage?.[s] || 0) / pipeMax) * 100}%` }} />
                </div>
                <span className="w-6 flex-none text-right tabular-nums text-on-surface-variant">{d.pipelineByStage?.[s] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 p-5">
          <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Email · last 30 days</h2>
          <div className="flex gap-6">
            <div><div className="text-xl font-semibold text-on-surface tabular-nums">{d.mailInbound30d}</div><div className="text-[11px] text-on-surface-variant/60">Received</div></div>
            <div><div className="text-xl font-semibold text-on-surface tabular-nums">{d.mailOutbound30d}</div><div className="text-[11px] text-on-surface-variant/60">Sent</div></div>
          </div>
          <Link href="/admin/mail/dashboard" className="text-[11px] text-primary mt-3 inline-block">Mail dashboard →</Link>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 p-5">
          <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Needs attention</h2>
          <ul className="space-y-1.5 text-sm">
            {d.unassignedEnquiries > 0 && <li><Link href="/admin/enquiries?status=submitted" className="text-on-surface-variant hover:text-primary">{d.unassignedEnquiries} unassigned enquir{d.unassignedEnquiries === 1 ? 'y' : 'ies'}</Link></li>}
            {d.pendingKYC > 0 && <li><Link href="/admin/kyc" className="text-on-surface-variant hover:text-primary">{d.pendingKYC} KYC review{d.pendingKYC === 1 ? '' : 's'} pending</Link></li>}
            {d.tasksOverdue > 0 && <li><Link href="/admin/crm/tasks" className="text-amber-400 hover:text-amber-300">{d.tasksOverdue} overdue task{d.tasksOverdue === 1 ? '' : 's'}</Link></li>}
            {d.unassignedEnquiries === 0 && d.pendingKYC === 0 && d.tasksOverdue === 0 && <li className="text-on-surface-variant/50">All clear.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
