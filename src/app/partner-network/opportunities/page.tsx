'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Opportunity {
  id: string
  reference_number: string
  title: string
  status: string
  opportunity_type: string
  created_at: string
  sectors: { name: string } | null
  admin_notes: string | null
}

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-neutral-500/20 text-neutral-400',
  submitted: 'bg-yellow-500/20 text-yellow-400',
  more_info_required: 'bg-orange-500/20 text-orange-400',
  approved: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  archived: 'bg-neutral-500/20 text-neutral-400',
}

export default function MyOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/partner/opportunities')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setOpportunities(json.data || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-on-surface-variant py-12 text-center">Loading opportunities...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="cinzel-text text-2xl text-on-surface">My Opportunities</h1>
        <Link href="/partner-network/add-opportunity" className="text-xs px-4 py-2 bg-primary text-on-primary raleway-text">+ Add Opportunity</Link>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6"><p className="text-sm text-red-400">{error}</p></div>}

      {opportunities.length === 0 ? (
        <div className="bg-surface-container border border-outline-variant/10 px-6 py-16 text-center">
          <p className="text-on-surface-variant text-sm">You haven't submitted any opportunities yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {opportunities.map((o) => {
            const editable = o.status === 'draft' || o.status === 'more_info_required'
            return (
              <div key={o.id} className="bg-surface-container border border-outline-variant/10 px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-on-surface truncate">{o.title}</span>
                      <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_BADGES[o.status] || ''}`}>{o.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-xs text-on-surface-variant/60">{o.reference_number} {o.sectors ? `· ${o.sectors.name}` : ''} · {o.opportunity_type.replace(/_/g, ' ')}</div>
                    {o.status === 'more_info_required' && o.admin_notes && (
                      <div className="text-xs text-orange-400 mt-1">CZAAH requested: {o.admin_notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-on-surface-variant/40">{new Date(o.created_at).toLocaleDateString()}</span>
                    {editable && (
                      <Link href={`/partner-network/opportunities/${o.id}`} className="text-xs text-primary hover:underline">Edit</Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
