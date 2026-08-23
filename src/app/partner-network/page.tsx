'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  partner: { partner_id: string; referral_code: string | null }
  counts: { total: number; underReview: number; approved: number; inProgress: number; completed: number }
  newMessages: number
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-surface-container border border-outline-variant/10 px-5 py-6">
      <div className="cinzel-text text-2xl text-on-surface mb-1">{value}</div>
      <div className="raleway-text text-xs text-on-surface-variant/60 uppercase tracking-wide">{label}</div>
    </div>
  )
}

export default function PartnerDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/partner/me')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setStats(json)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-on-surface-variant py-12 text-center">Loading dashboard...</div>
  if (error || !stats) return <div className="text-red-400 py-12 text-center">{error || 'Failed to load'}</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="cinzel-text text-2xl text-on-surface mb-1">Partner Dashboard</h1>
        <p className="raleway-text text-sm text-on-surface-variant/60">Partner ID: <span className="text-primary">{stats.partner.partner_id}</span></p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Opportunities" value={stats.counts.total} />
        <StatCard label="Under Review" value={stats.counts.underReview} />
        <StatCard label="Approved" value={stats.counts.approved} />
        <StatCard label="In Progress" value={stats.counts.inProgress} />
        <StatCard label="Completed" value={stats.counts.completed} />
        <StatCard label="New Messages" value={stats.newMessages} />
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/partner-network/add-opportunity" className="text-sm px-5 py-2.5 bg-primary text-on-primary raleway-text">
          + Add Opportunity
        </Link>
        <Link href="/partner-network/opportunities" className="text-sm px-5 py-2.5 border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 transition-colors raleway-text">
          View My Opportunities
        </Link>
      </div>
    </div>
  )
}
