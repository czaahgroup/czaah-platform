'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

// This page also renders at /admin/my-investments via a re-export — keep
// every internal link scoped to whichever portal shell it's viewed under.
function useInvestmentsBasePath() {
  const pathname = usePathname()
  return pathname?.startsWith('/admin') ? '/admin/my-investments' : '/dashboard/investments'
}

interface Investment {
  id: string
  title: string
  sector_tag: string | null
  status: string
  min_investment_amount: number | null
  currency: string
  target_return: string | null
  investment_timeline: string | null
  description: string | null
  location: string | null
  key_highlights: string[]
  published_at: string | null
}

const STATUS_BADGES: Record<string, string> = {
  published: 'bg-green-500/10 text-green-400',
  closing_soon: 'bg-orange-500/10 text-orange-400',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount === null || amount === undefined) return '--'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function InvestmentsBrowsePage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const router = useRouter()
  const basePath = useInvestmentsBasePath()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const res = await fetch('/api/investments')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load investments')
        setInvestments(json.data || [])
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sectors = [...new Set(investments.map((inv) => inv.sector_tag).filter(Boolean))] as string[]

  const filtered = investments.filter((inv) => {
    const matchesSector = !sectorFilter || inv.sector_tag === sectorFilter
    const matchesSearch = !search ||
      inv.title.toLowerCase().includes(search.toLowerCase()) ||
      (inv.sector_tag?.toLowerCase().includes(search.toLowerCase())) ||
      (inv.location?.toLowerCase().includes(search.toLowerCase()))
    return matchesSector && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="raleway-text text-on-surface-variant/50">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="cinzel-text text-2xl text-on-surface mb-1">Investment Opportunities</h1>
        <p className="text-sm text-on-surface-variant/50 raleway-text">Explore exclusive investment opportunities curated by CZAAH.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search investments..."
          className="flex-1 bg-transparent border-b border-outline-variant focus:border-primary px-1 py-2.5 text-on-surface placeholder:text-on-surface-variant/30 text-sm outline-none transition-colors raleway-text"
        />
        {sectors.length > 0 && (
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant/10 px-4 py-2.5 text-on-surface text-sm outline-none raleway-text"
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 px-4 py-3 mb-6">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center">
          <p className="text-on-surface-variant/50 raleway-text">
            {investments.length === 0
              ? 'No investment opportunities available at this time.'
              : 'No investments match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((inv) => (
            <Link
              key={inv.id}
              href={`${basePath}/${inv.id}`}
              className="group bg-surface-container-low border border-outline-variant/10 overflow-hidden hover:border-primary/30 transition-all no-underline"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="cinzel-text text-lg text-on-surface group-hover:text-primary transition-colors leading-tight">{inv.title}</h3>
                  <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_BADGES[inv.status] || ''}`}>{formatStatus(inv.status)}</span>
                </div>

                {inv.sector_tag && (
                  <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 mb-3">{inv.sector_tag}</span>
                )}

                {inv.description && (
                  <p className="text-sm text-on-surface-variant/50 line-clamp-2 mb-4 raleway-text">{inv.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant/10">
                  <div>
                    <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-0.5 raleway-text">Min Investment</p>
                    <p className="text-sm text-on-surface font-medium raleway-text">{formatCurrency(inv.min_investment_amount, inv.currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-0.5 raleway-text">Target Return</p>
                    <p className="text-sm text-primary font-medium raleway-text">{inv.target_return || '--'}</p>
                  </div>
                  {inv.investment_timeline && (
                    <div>
                      <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-0.5 raleway-text">Timeline</p>
                      <p className="text-sm text-on-surface raleway-text">{inv.investment_timeline}</p>
                    </div>
                  )}
                  {inv.location && (
                    <div>
                      <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-0.5 raleway-text">Location</p>
                      <p className="text-sm text-on-surface raleway-text">{inv.location}</p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
