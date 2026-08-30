'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const TYPES = ['contact', 'company', 'enquiry', 'partner_opportunity', 'investment_opportunity']

function kb(n: number | null) { return n ? `${(n / 1024).toFixed(0)} KB` : '—' }

export default function DocumentLibraryPage() {
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [type, setType] = useState('')

  useEffect(() => { const t = setTimeout(() => setQd(q.trim()), 300); return () => clearTimeout(t) }, [q])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (qd) params.set('q', qd)
      if (type) params.set('type', type)
      const res = await fetch(`/api/documents?${params}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setRows(j.data); setTotal(j.total); setHasMore(j.hasMore)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [page, qd, type])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [qd, type])

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-1">Document Library</h1>
      <p className="text-sm text-on-surface-variant mb-6">{total.toLocaleString()} file{total === 1 ? '' : 's'} across the CRM</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4 text-sm text-red-400">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by filename…" className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface text-sm max-w-xs" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm">
          <option value="">All records</option>
          {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center text-on-surface-variant text-sm">No documents match.</div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  {['File', 'On', 'Size', 'Uploaded'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest/40 transition-colors">
                    <td className="px-5 py-3">
                      <a href={d.url || '#'} target="_blank" rel="noopener" className="text-on-surface hover:text-primary">{d.filename}</a>
                      {d.label && <div className="text-on-surface-variant/50 text-xs">{d.label}</div>}
                    </td>
                    <td className="px-5 py-3">
                      {d.relatedHref ? <Link href={d.relatedHref} className="text-primary text-xs">{d.relatedType}</Link> : <span className="text-on-surface-variant/50 text-xs">{d.relatedType}</span>}
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant/60 text-xs tabular-nums">{kb(d.sizeBytes)}</td>
                    <td className="px-5 py-3 text-on-surface-variant/60 text-xs">{d.uploadedBy || '—'} · {new Date(d.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="text-primary disabled:opacity-30 px-2 py-1">← Previous</button>
          <span className="text-on-surface-variant/50 text-xs">Page {page + 1}</span>
          <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className="text-primary disabled:opacity-30 px-2 py-1">Next →</button>
        </div>
      )}
    </div>
  )
}
