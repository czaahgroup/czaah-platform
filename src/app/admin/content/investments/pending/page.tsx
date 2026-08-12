'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import { openFile } from '@/lib/utils/openFile'


interface PendingDeal {
  id: string
  title: string
  sector_tag: string | null
  description: string | null
  min_investment_amount: number | null
  currency: string
  target_return: string | null
  investment_timeline: string | null
  location: string | null
  key_highlights: string[]
  status: string
  approval_status: string
  submitted_by: string
  created_at: string
  submitter: {
    full_name: string
    email: string
    company_name: string | null
  } | null
}

interface Doc {
  id: string
  document_type: string
  file_url: string
  file_name: string
  uploaded_at: string
}

export default function PendingDealsPage() {
  const [deals, setDeals] = useState<PendingDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<PendingDeal | null>(null)
  const [documents, setDocuments] = useState<Doc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [processing, setProcessing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/investments/pending')
      if (!res.ok) throw new Error('Failed to load pending deals')
      const data = await res.json()
      setDeals(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function selectDeal(deal: PendingDeal) {
    setSelectedDeal(deal)
    setLoadingDocs(true)
    setDocuments([])
    try {
      // Fetch documents for the deal using admin investments API
      const res = await fetch(`/api/admin/investments/${deal.id}`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      }
    } catch { /* silent */ }
    setLoadingDocs(false)
  }

  async function handleApprove(dealId: string) {
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/investments/${dealId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Approval failed')
      }
      setSelectedDeal(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject(dealId: string) {
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/investments/${dealId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', notes: rejectNotes || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Rejection failed')
      }
      setShowRejectModal(false)
      setRejectNotes('')
      setSelectedDeal(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rejection failed')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading pending deals...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Pending Partner Deals</h1>
          <p className="text-on-surface-variant text-sm mt-1">Review and approve or reject investment deals submitted by partners.</p>
        </div>
        <span className="bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded">
          {deals.length} Pending
        </span>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {deals.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-16 text-center">
          <p className="text-on-surface-variant">No pending deals to review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <div
              key={deal.id}
              onClick={() => selectDeal(deal)}
              className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-5 cursor-pointer hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-[family-name:var(--font-heading)] text-base text-on-surface">{deal.title}</h3>
                <span className="text-xs bg-yellow-500/15 text-yellow-400 px-3 py-1 rounded-nonefont-semibold">
                  Pending Approval
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                {deal.sector_tag && (
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{deal.sector_tag}</span>
                )}
                {deal.submitter && (
                  <span>Submitted by: <span className="text-on-surface">{deal.submitter.full_name}</span>
                    {deal.submitter.company_name && <span className="text-on-surface-variant/50"> ({deal.submitter.company_name})</span>}
                  </span>
                )}
                <span>{new Date(deal.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deal review modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-none w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between sticky top-0 bg-surface-container-low z-10">
              <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">Review Deal</h2>
              <button
                onClick={() => { setSelectedDeal(null); setDocuments([]) }}
                className="text-on-surface-variant hover:text-on-surface text-xl leading-none"
              >&times;</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Title</p>
                <p className="text-on-surface">{selectedDeal.title}</p>
              </div>

              {/* Submitter */}
              {selectedDeal.submitter && (
                <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-3">
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Submitted By</p>
                  <p className="text-on-surface text-sm">{selectedDeal.submitter.full_name}</p>
                  <p className="text-on-surface-variant/50 text-xs">{selectedDeal.submitter.email}</p>
                  {selectedDeal.submitter.company_name && (
                    <p className="text-on-surface-variant text-xs mt-1">{selectedDeal.submitter.company_name}</p>
                  )}
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Sector</p>
                  <p className="text-on-surface text-sm">{selectedDeal.sector_tag || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Location</p>
                  <p className="text-on-surface text-sm">{selectedDeal.location || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Min Investment</p>
                  <p className="text-on-surface text-sm">
                    {selectedDeal.min_investment_amount
                      ? `${selectedDeal.currency} ${selectedDeal.min_investment_amount.toLocaleString()}`
                      : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Target Return</p>
                  <p className="text-on-surface text-sm">{selectedDeal.target_return || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Timeline</p>
                  <p className="text-on-surface text-sm">{selectedDeal.investment_timeline || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Submitted</p>
                  <p className="text-on-surface text-sm">{new Date(selectedDeal.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Description */}
              {selectedDeal.description && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Description</p>
                  <p className="text-on-surface/70 text-sm leading-relaxed">{selectedDeal.description}</p>
                </div>
              )}

              {/* Key Highlights */}
              {selectedDeal.key_highlights && selectedDeal.key_highlights.length > 0 && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-2 uppercase tracking-wider">Key Highlights</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDeal.key_highlights.map((h, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded">{h}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div>
                <p className="text-xs text-on-surface-variant mb-2 uppercase tracking-wider">Documents</p>
                {loadingDocs ? (
                  <p className="text-on-surface-variant/50 text-sm">Loading documents...</p>
                ) : documents.length === 0 ? (
                  <p className="text-on-surface-variant/50 text-sm">No documents attached.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => openFile(doc.file_url)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left' }}
                        className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 hover:border-primary/20 transition-colors"
                      >
                        <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span className="text-sm text-on-surface truncate">{doc.file_name}</span>
                        <span className="text-xs text-on-surface-variant/50 shrink-0">({doc.document_type})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-outline-variant/10 flex gap-3 justify-end sticky bottom-0 bg-surface-container-low">
              <button
                onClick={() => { setSelectedDeal(null); setDocuments([]) }}
                className="px-4 py-2 rounded-nonetext-sm text-on-surface-variant hover:text-on-surface border border-outline-variant/10 hover:border-primary/50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setRejectNotes(''); setShowRejectModal(true) }}
                disabled={processing}
                className="px-5 py-2 rounded-nonetext-sm font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(selectedDeal.id)}
                disabled={processing}
                className="bg-primary text-on-primary font-semibold px-5 py-2 rounded-nonetext-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && selectedDeal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-none w-full max-w-sm mx-4 p-6">
            <h3 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-2">Reject Deal</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Provide a reason for rejecting &quot;{selectedDeal.title}&quot;. This will be visible to the partner.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection (optional but recommended)..."
              className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm resize-none h-24 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-nonetext-sm text-on-surface-variant hover:text-on-surface border border-outline-variant/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedDeal.id)}
                disabled={processing}
                className="bg-red-500/80 text-white font-semibold px-5 py-2 rounded-nonetext-sm hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {processing ? 'Rejecting...' : 'Reject Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
