'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const TYPE_BADGE: Record<string, string> = {
  Deal: 'bg-primary/10 text-primary',
  Project: 'bg-blue-500/10 text-blue-400',
  Trade: 'bg-amber-500/10 text-amber-400',
}

export default function PortfolioPage() {
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      try {
        const res = await fetch('/api/portal/items')
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || 'Failed to load')
        setItems(j.data || [])
      } catch (e: any) {
        setError(e.message)
      } finally { setLoading(false) }
    })()
  }, [])

  return (
    <>
      <div className="mb-6">
        <h1 className="cinzel-text text-2xl text-on-surface mb-1">My Portfolio</h1>
        <p className="text-sm text-on-surface-variant/50 raleway-text">Deals, projects and trades your CZAAH team has shared with you.</p>
      </div>

      {error && <div className="bg-error/10 border border-error/20 px-4 py-3 mb-6"><p className="text-sm text-error">{error}</p></div>}

      {loading ? (
        <p className="text-on-surface-variant/50 text-sm raleway-text py-12 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center">
          <p className="text-on-surface-variant/50 raleway-text">Nothing has been shared with you yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((it) => (
            <Link key={it.shareId} href={`/dashboard/portfolio/${it.type}/${it.id}`}
              className="group bg-surface-container-low border border-outline-variant/10 p-5 hover:border-primary/30 transition-all no-underline">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="cinzel-text text-lg text-on-surface group-hover:text-primary transition-colors leading-tight">{it.title}</h3>
                <span className={`text-xs px-2 py-0.5 shrink-0 ${TYPE_BADGE[it.typeLabel] || 'bg-surface-container text-on-surface-variant'}`}>{it.typeLabel}</span>
              </div>
              {it.reference && <p className="text-[11px] font-mono text-on-surface-variant/40 mb-2">{it.reference}</p>}
              <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/10 text-sm">
                {it.status && <span className="text-on-surface-variant/70 capitalize raleway-text">{String(it.status).replace(/_/g, ' ')}</span>}
                {it.progressPct != null && (
                  <span className="flex items-center gap-2 flex-1">
                    <span className="flex-1 bg-surface-container-lowest h-1.5"><span className="block bg-primary/70 h-1.5" style={{ width: `${it.progressPct}%` }} /></span>
                    <span className="text-[11px] text-on-surface-variant tabular-nums">{it.progressPct}%</span>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
