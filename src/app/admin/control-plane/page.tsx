'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

function fmt(n: number) {
  if (!n) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return String(n)
}
function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const TARGET_HREF: Record<string, (id: string) => string> = {
  contact: (id) => `/admin/crm/contacts/${id}`,
  company: (id) => `/admin/crm/companies/${id}`,
  deal: (id) => `/admin/crm/deals/${id}`,
  job_order: (id) => `/admin/recruitment/orders/${id}`,
  construction_project: (id) => `/admin/construction/projects/${id}`,
  commodity_trade: (id) => `/admin/trading/trades/${id}`,
  enquiry: (id) => `/admin/enquiries/${id}`,
}

function Section({ title, href, children }: any) {
  return (
    <div className="bg-surface-container-low border border-outline-variant/10 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60">{title}</h2>
        <Link href={href} className="text-[11px] text-primary">Open →</Link>
      </div>
      <div className="grid grid-cols-3 gap-3">{children}</div>
    </div>
  )
}
function Stat({ label, value }: any) {
  return (
    <div>
      <div className="text-xl font-semibold tabular-nums text-on-surface">{value ?? 0}</div>
      <div className="text-[10px] uppercase tracking-wide text-on-surface-variant/50 mt-0.5">{label}</div>
    </div>
  )
}

export default function ControlPlanePage() {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/control-plane')
      .then((r) => r.ok ? r.json() : r.json().then((j) => Promise.reject(new Error(j.error || 'Failed'))))
      .then(setD)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (error) return <div className="text-red-400 py-12 text-center text-sm">{error}</div>
  if (!d) return null

  return (
    <div className="max-w-5xl">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-1">Control Plane</h1>
      <p className="text-sm text-on-surface-variant mb-6">One snapshot across the CRM and every business module.</p>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="CRM & Directory" href="/admin/crm/dashboard">
          <Stat label="Contacts" value={d.crm.contacts} />
          <Stat label="Companies" value={d.crm.companies} />
          <Stat label="Active leads" value={d.crm.activeLeads} />
          <Stat label="Partner firms" value={d.crm.orgByType?.partner_firm} />
          <Stat label="Investors" value={d.crm.orgByType?.investor} />
          <Stat label="Documents" value={d.crm.documents} />
        </Section>

        <Section title="Deals" href="/admin/crm/deals">
          <Stat label="Open" value={d.deals.open} />
          <Stat label="Weighted" value={fmt(d.deals.weightedPipeline)} />
          <Stat label="Won (qtr)" value={d.deals.wonThisQuarter} />
        </Section>

        <Section title="Recruitment" href="/admin/recruitment">
          <Stat label="Open orders" value={d.recruitment.openOrders} />
          <Stat label="In pipeline" value={d.recruitment.inPipeline} />
          <Stat label="Deployed 30d" value={d.recruitment.deployedLast30d} />
        </Section>

        <Section title="Construction" href="/admin/construction">
          <Stat label="Active projects" value={d.construction.activeProjects} />
          <Stat label="Avg progress" value={`${d.construction.avgProgress}%`} />
          <Stat label="Contract value" value={fmt(d.construction.contractValue)} />
        </Section>

        <Section title="Trading" href="/admin/trading">
          <Stat label="Open trades" value={d.trading.openTrades} />
          <Stat label="Notional" value={fmt(d.trading.notionalOpen)} />
          <Stat label="Shipments" value={d.trading.activeShipments} />
        </Section>

        <div className="bg-surface-container-low border border-outline-variant/10 p-5">
          <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Recent activity</h2>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {d.recent.length === 0 && <p className="text-on-surface-variant/50 text-sm">Nothing yet.</p>}
            {d.recent.map((r: any) => {
              const href = r.targetType && TARGET_HREF[r.targetType] && r.targetId ? TARGET_HREF[r.targetType](r.targetId) : null
              const label = <span className="text-sm text-on-surface-variant"><span className="text-on-surface">{r.action.replace(/\./g, ' ')}</span> · {r.actor}</span>
              return (
                <div key={r.id} className="flex items-baseline justify-between gap-3">
                  {href ? <Link href={href} className="hover:text-primary">{label}</Link> : label}
                  <span className="text-[11px] text-on-surface-variant/40 flex-none">{timeAgo(r.at)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
