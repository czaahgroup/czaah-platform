'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

function fmt(n: number) {
  if (!n) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return String(n)
}

export default function ConstructionOverviewPage() {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/construction/overview').then((r) => r.ok ? r.json() : null).then(setD).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (!d) return <div className="text-red-400 py-12 text-center text-sm">Could not load the construction overview.</div>

  const kpis = [
    { label: 'Active projects', value: d.activeProjects, href: '/admin/construction/projects' },
    { label: 'In progress', value: d.inProgress, href: '/admin/construction/projects?status=in_progress' },
    { label: 'Avg. progress', value: `${d.avgProgress}%`, href: '/admin/construction/projects' },
    { label: 'Due within 30d', value: d.dueSoon, href: '/admin/construction/projects', alert: d.dueSoon > 0 },
    { label: 'Overdue', value: d.overdue, href: '/admin/construction/projects', alert: d.overdue > 0 },
    { label: 'Completed', value: d.completed, href: '/admin/construction/projects?status=completed' },
    { label: 'Active contract value', value: fmt(d.contractValueActive), href: '/admin/construction/projects' },
  ]

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Construction</h1>
        <Link href="/admin/construction/projects" className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors">Projects →</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="bg-surface-container-low border border-outline-variant/10 hover:border-primary/40 transition-colors p-4 block">
            <div className={`text-2xl font-semibold tabular-nums ${k.alert ? 'text-amber-400' : 'text-on-surface'}`}>{k.value ?? 0}</div>
            <div className="text-[11px] uppercase tracking-wide text-on-surface-variant/60 mt-1">{k.label}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
