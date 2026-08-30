'use client'
// @ts-nocheck

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const HIDE = new Set(['id', 'created_at'])
const LABELS: Record<string, string> = {
  reference: 'Reference', title: 'Title', name: 'Name', kind: 'Type', stage: 'Stage', status: 'Status',
  value_amount: 'Value', agreed_amount: 'Agreed', currency: 'Currency', expected_close: 'Expected close',
  closed_at: 'Closed', description: 'Description', project_type: 'Type', progress_pct: 'Progress %',
  site_location: 'Site', start_date: 'Start', target_completion: 'Target completion', actual_completion: 'Completed',
  desk: 'Desk', side: 'Side', commodity: 'Commodity', grade: 'Grade', quantity: 'Quantity', quantity_unit: 'Unit',
  incoterm: 'Incoterm', load_port: 'Load port', discharge_port: 'Discharge port', laycan_start: 'Laycan start', laycan_end: 'Laycan end',
}

export default function PortfolioItemPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      try {
        const res = await fetch(`/api/portal/items/${type}/${id}`)
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || 'Failed to load')
        setD(j.data)
      } catch (e: any) {
        setError(e.message)
      } finally { setLoading(false) }
    })()
  }, [type, id])

  if (loading) return <p className="text-on-surface-variant/50 text-sm raleway-text py-12 text-center">Loading…</p>
  if (error) return (
    <>
      <Link href="/dashboard/portfolio" className="text-xs text-primary raleway-text">← My Portfolio</Link>
      <p className="text-error text-sm raleway-text py-12 text-center">{error}</p>
    </>
  )
  if (!d) return null

  const r = d.resource
  const title = r.title || r.name || r.reference
  const rows = Object.entries(r).filter(([k, v]) => !HIDE.has(k) && v != null && v !== '' && k !== 'title' && k !== 'name')

  return (
    <>
      <Link href="/dashboard/portfolio" className="text-xs text-primary raleway-text">← My Portfolio</Link>
      <div className="mt-3 mb-6">
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5">{d.typeLabel}</span>
        <h1 className="cinzel-text text-2xl text-on-surface mt-2">{title}</h1>
      </div>

      {r.progress_pct != null && (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 bg-surface-container-lowest h-2"><div className="bg-primary/70 h-2" style={{ width: `${r.progress_pct}%` }} /></div>
          <span className="text-sm text-on-surface tabular-nums">{r.progress_pct}%</span>
        </div>
      )}

      <div className="bg-surface-container-low border border-outline-variant/10 p-5 mb-6">
        <dl className="grid grid-cols-[130px_1fr] gap-y-2.5 gap-x-4 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-on-surface-variant/50 raleway-text">{LABELS[k] || k.replace(/_/g, ' ')}</dt>
              <dd className="text-on-surface raleway-text whitespace-pre-wrap capitalize">{String(v).replace(/_/g, ' ')}</dd>
            </div>
          ))}
        </dl>
      </div>

      {d.steps?.length > 0 && (
        <div className="mb-6">
          <h2 className="cinzel-text text-lg text-on-surface mb-3">Progress</h2>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {d.steps.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-2 h-2 rounded-full flex-none ${['done', 'waived'].includes(s.status) ? 'bg-primary' : s.status === 'blocked' ? 'bg-error' : 'bg-outline-variant'}`} />
                <span className={`flex-1 text-sm raleway-text ${['done', 'waived'].includes(s.status) ? 'text-on-surface-variant/50' : 'text-on-surface'}`}>{s.name}</span>
                <span className="text-[11px] text-on-surface-variant/40 flex-none capitalize">{s.done_date || s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.updates?.length > 0 && (
        <div className="mb-6">
          <h2 className="cinzel-text text-lg text-on-surface mb-3">Updates</h2>
          <div className="space-y-2">
            {d.updates.map((u: any, i: number) => (
              <div key={i} className="bg-surface-container-low border border-outline-variant/10 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-on-surface raleway-text font-medium">{u.headline}</span>
                  <span className="text-[11px] text-on-surface-variant/50 flex-none">{u.report_date}{u.progress_pct != null ? ` · ${u.progress_pct}%` : ''}</span>
                </div>
                {u.body && <p className="text-sm text-on-surface-variant/70 mt-1.5 raleway-text whitespace-pre-wrap">{u.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {d.canViewDocuments && (
        <div>
          <h2 className="cinzel-text text-lg text-on-surface mb-3">Documents</h2>
          {d.documents.length === 0 ? (
            <p className="text-on-surface-variant/50 text-sm raleway-text">No documents shared.</p>
          ) : (
            <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
              {d.documents.map((doc: any) => (
                <a key={doc.id} href={doc.url || '#'} target="_blank" rel="noopener" className="flex items-center gap-3 px-4 py-3 no-underline hover:bg-surface-container-lowest/40">
                  <span className="text-sm text-on-surface hover:text-primary raleway-text truncate flex-1">{doc.filename}</span>
                  <span className="text-[11px] text-on-surface-variant/40 flex-none">{doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(0)} KB` : ''}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
