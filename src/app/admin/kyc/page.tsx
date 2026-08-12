'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'


interface KYCApplication {
  id: string
  full_name: string
  email: string
  company_name: string | null
  country: string | null
  role: string
  status: string
  created_at: string
  kyc_documents: {
    id: string
    document_type: string
    file_url: string
    review_status: string
  }[]
}

export default function KYCReviewPage() {
  const [applications, setApplications] = useState<KYCApplication[]>([])
  const [selected, setSelected] = useState<KYCApplication | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')

  async function loadApplications() {
    try {
      const res = await fetch(`/api/admin/kyc?filter=${filter}`)
      if (!res.ok) {
        console.error('KYC fetch failed:', res.status)
        setApplications([])
        return
      }
      const data = await res.json()
      setApplications(data as KYCApplication[])
    } catch (err) {
      console.error('KYC fetch error:', err)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApprove(userId: string) {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/kyc/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Approve failed:', err)
      }
    } catch (err) {
      console.error('Approve error:', err)
    }
    setSelected(null)
    setActionLoading(false)
    loadApplications()
  }

  async function handleReject(userId: string) {
    if (!rejectionReason.trim()) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/kyc/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: rejectionReason }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Reject failed:', err)
      }
    } catch (err) {
      console.error('Reject error:', err)
    }
    setSelected(null)
    setRejectionReason('')
    setActionLoading(false)
    loadApplications()
  }

  async function handleViewDocument(filePath: string) {
    try {
      const res = await fetch(`/api/admin/kyc/document?path=${encodeURIComponent(filePath)}`)
      if (!res.ok) {
        console.error('Document fetch failed')
        return
      }
      const { url } = await res.json()
      window.open(url, '_blank')
    } catch (err) {
      console.error('Document error:', err)
    }
  }

  const docTypeLabels: Record<string, string> = {
    government_id_front: 'Government ID (Front)',
    government_id_back: 'Government ID (Back)',
    company_registration: 'Company Registration',
    proof_of_address: 'Proof of Address',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">
          KYC Review
        </h1>
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-nonetext-sm transition-colors ${
                filter === f
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-16 text-center">
          <p className="text-on-surface-variant">No {filter === 'all' ? '' : filter} applications found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Application list */}
          <div className="space-y-3">
            {applications.map((app) => (
              <button
                key={app.id}
                onClick={() => { setSelected(app); setRejectionReason('') }}
                className={`w-full text-left bg-surface-container-low border rounded-none px-5 py-4 transition-colors ${
                  selected?.id === app.id
                    ? 'border-primary'
                    : 'border-outline-variant/10 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-on-surface">{app.full_name}</span>
                  <StatusBadge status={app.status} />
                </div>
                <p className="text-sm text-on-surface-variant">{app.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <RoleBadge role={app.role} />
                  {app.company_name && (
                    <span className="text-sm text-on-surface-variant/50">{app.company_name} · {app.country}</span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant/50 mt-2">
                  Applied {new Date(app.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-on-surface-variant/50">
                  {app.kyc_documents?.length || 0} documents uploaded
                </p>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selected ? (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-none">
              <div className="px-6 py-4 border-b border-outline-variant/10">
                <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">
                  {selected.full_name}
                </h2>
                <p className="text-sm text-on-surface-variant">{selected.email}</p>
              </div>

              {/* Documents */}
              <div className="px-6 py-4 border-b border-outline-variant/10">
                <h3 className="text-sm font-semibold text-on-surface-variant mb-3">Documents</h3>
                <div className="space-y-2">
                  {selected.kyc_documents?.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-surface-container-lowest rounded-nonepx-4 py-3">
                      <span className="text-sm text-on-surface">
                        {docTypeLabels[doc.document_type] || doc.document_type}
                      </span>
                      <button
                        onClick={() => handleViewDocument(doc.file_url)}
                        className="text-sm text-primary hover:text-primary-light transition-colors"
                      >
                        View
                      </button>
                    </div>
                  ))}
                  {(!selected.kyc_documents || selected.kyc_documents.length === 0) && (
                    <p className="text-sm text-on-surface-variant/50">No documents uploaded.</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selected.status === 'pending_kyc_review' && (
                <div className="px-6 py-4">
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() => handleApprove(selected.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-nonehover:bg-green-600/80 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : 'Approve'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm text-on-surface-variant mb-1.5">Rejection Reason</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Specify reason for rejection..."
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm resize-none h-20"
                    />
                    <button
                      onClick={() => handleReject(selected.id)}
                      disabled={actionLoading || !rejectionReason.trim()}
                      className="mt-2 w-full bg-error/20 text-error font-semibold py-2.5 rounded-nonehover:bg-error/30 transition-colors disabled:opacity-50"
                    >
                      Reject Application
                    </button>
                  </div>
                </div>
              )}

              {selected.status !== 'pending_kyc_review' && (
                <div className="px-6 py-4">
                  <StatusBadge status={selected.status} large />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-none flex items-center justify-center py-16">
              <p className="text-on-surface-variant">Select an application to review</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: 'bg-blue-500/20 text-blue-400',
    member: 'bg-neutral-500/20 text-neutral-400',
    elite_member: 'bg-emerald-500/20 text-emerald-400',
    investment_partner: 'bg-purple-500/20 text-purple-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-none${styles[role] || 'bg-neutral-500/20 text-neutral-400'}`}>
      {role.replace(/_/g, ' ')}
    </span>
  )
}

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const styles: Record<string, string> = {
    pending_kyc_review: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    deactivated: 'bg-surface-container-high text-on-surface-variant',
  }
  return (
    <span className={`${large ? 'px-4 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'} rounded-none${styles[status] || ''}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
