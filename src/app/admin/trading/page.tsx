'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

const DESK_LABEL: Record<string, string> = { oil_gas: 'Oil & Gas', minerals: 'Minerals', agri: 'Agri', other: 'Other' }

function fmt(n: number) {
  if (!n) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return String(n)
}

export default function TradingOverviewPage() {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/trading/overview').then((r) => r.ok ? r.json() : null).then(setD).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (!d) return <div className="text-red-400 py-12 text-center text-sm">Could not load the trading overview.</div>

  const kpis = [
    { label: 'Open trades', value: d.openTrades, href: '/admin/trading/trades?view=open' },
    { label: 'Executing', value: d.executing, href: '/admin/trading/trades?status=contract' },
    { label: 'Active shipments', value: d.activeShipments, href: '/admin/trading/trades' },
    { label: 'Settled', value: d.settled, href: '/admin/trading/trades?status=settled' },
    { label: 'Open notional', value: fmt(d.notionalOpen), href: '/admin/trading/trades?view=open' },
  ]
  const max = Math.max(1, ...Object.values(d.byDesk || {}))

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Trading Desk</h1>
        <Link href="/admin/trading/trades" className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors">Trades →</Link>
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
        <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Open trades by desk</h2>
        <div className="space-y-2">
          {Object.keys(DESK_LABEL).map((k) => (
            <div key={k} className="flex items-center gap-3 text-xs">
              <span className="w-20 flex-none text-on-surface-variant/70">{DESK_LABEL[k]}</span>
              <div className="flex-1 bg-surface-container-lowest h-2"><div className="bg-primary/70 h-2" style={{ width: `${((d.byDesk?.[k] || 0) / max) * 100}%` }} /></div>
              <span className="w-6 flex-none text-right tabular-nums text-on-surface-variant">{d.byDesk?.[k] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
