'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { openFile } from '@/lib/utils/openFile'

export const runtime = 'edge';

interface Deal {
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
  approval_notes: string | null
  created_at: string
  updated_at: string
}

interface Doc {
  id: string
  document_type: string
  file_url: string
  file_name: string
  uploaded_at: string
}

interface FormData {
  title: string
  sector_tag: string
  description: string
  min_investment_amount: string
  currency: string
  target_return: string
  investment_timeline: string
  location: string
  key_highlights: string
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0e0e0e',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 0,
  padding: '10px 14px',
  color: '#fff',
  fontFamily: "'Raleway', sans-serif",
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.3s ease',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Raleway', sans-serif",
  fontSize: '12px',
  color: 'rgba(255,255,255,0.4)',
  marginBottom: '6px',
  letterSpacing: '0.5px',
}

const APPROVAL_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  pending_approval: { bg: 'rgba(234,179,8,0.15)', color: '#eab308', label: 'Pending Approval' },
  approved: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Approved' },
  rejected: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Rejected' },
}

export default function DealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dealId = params.id as string

  const [deal, setDeal] = useState<Deal | null>(null)
  const [documents, setDocuments] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState<FormData>({
    title: '', sector_tag: '', description: '', min_investment_amount: '',
    currency: 'USD', target_return: '', investment_timeline: '', location: '', key_highlights: '',
  })

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/partner/deals/${dealId}`)
      if (!res.ok) throw new Error('Failed to load deal')
      const data = await res.json()
      setDeal(data.deal)
      setDocuments(data.documents || [])
      setForm({
        title: data.deal.title || '',
        sector_tag: data.deal.sector_tag || '',
        description: data.deal.description || '',
        min_investment_amount: data.deal.min_investment_amount?.toString() || '',
        currency: data.deal.currency || 'USD',
        target_return: data.deal.target_return || '',
        investment_timeline: data.deal.investment_timeline || '',
        location: data.deal.location || '',
        key_highlights: (data.deal.key_highlights || []).join(', '),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => { load() }, [load])

  function update(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const highlights = form.key_highlights
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean)

      const res = await fetch(`/api/partner/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          sector_tag: form.sector_tag || null,
          description: form.description || null,
          min_investment_amount: form.min_investment_amount || null,
          currency: form.currency || 'USD',
          target_return: form.target_return || null,
          investment_timeline: form.investment_timeline || null,
          location: form.location || null,
          key_highlights: highlights,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Update failed')
      }

      // Upload pending files
      if (pendingFiles.length > 0) {
        setUploading(true)
        for (const file of pendingFiles) {
          const reader = new FileReader()
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          await fetch(`/api/partner/deals/${dealId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64,
              documentType: file.name.toLowerCase().includes('teaser') ? 'teaser'
                : file.name.toLowerCase().includes('prospectus') ? 'prospectus'
                : file.name.toLowerCase().includes('due') ? 'due_diligence'
                : 'other',
            }),
          })
        }
        setPendingFiles([])
        setUploading(false)
      }

      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/partner/deals/${dealId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }
      router.push('/partner')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  async function handleDeleteDoc(docId: string) {
    try {
      const res = await fetch(`/api/partner/deals/${dealId}/documents?docId=${docId}`, { method: 'DELETE' })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId))
      }
    } catch { /* silent */ }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ fontFamily: "'Raleway', sans-serif", color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading deal...</p>
      </div>
    )
  }

  if (!deal) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ fontFamily: "'Raleway', sans-serif", color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Deal not found.</p>
        <Link href="/partner" style={{ color: '#C9A84C', fontFamily: "'Raleway', sans-serif", fontSize: '13px' }}>Back to My Deals</Link>
      </div>
    )
  }

  const isPending = deal.approval_status === 'pending_approval'
  const isApproved = deal.approval_status === 'approved'
  const isRejected = deal.approval_status === 'rejected'
  const badge = APPROVAL_BADGES[deal.approval_status] || APPROVAL_BADGES.pending_approval

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/partner" style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize: '12px',
          color: 'rgba(255,255,255,0.4)',
          textDecoration: 'none',
          letterSpacing: '0.5px',
        }}>&larr; Back to My Deals</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '24px',
          color: '#fff',
          margin: 0,
        }}>{isPending ? 'Edit Deal' : 'Deal Details'}</h1>
        <span style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.5px',
          padding: '4px 12px',
          borderRadius: 0,
          background: badge.bg,
          color: badge.color,
        }}>{badge.label}</span>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 0,
          padding: '12px 16px',
          marginBottom: '24px',
        }}>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#ef4444', margin: 0 }}>{error}</p>
        </div>
      )}

      {isApproved && (
        <div style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 0,
          padding: '16px 20px',
          marginBottom: '24px',
        }}>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#22c55e', margin: 0 }}>
            This deal has been approved and is now managed by the admin team.
          </p>
        </div>
      )}

      {isRejected && deal.approval_notes && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 0,
          padding: '16px 20px',
          marginBottom: '24px',
        }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', color: '#ef4444', margin: '0 0 6px', fontWeight: 600 }}>Rejection Notes</p>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(239,68,68,0.8)', margin: 0 }}>{deal.approval_notes}</p>
        </div>
      )}

      <div style={{
        background: '#1c1b1b',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 0,
        padding: '32px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            {isPending ? (
              <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)} style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }} />
            ) : (
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#fff', margin: 0 }}>{deal.title}</p>
            )}
          </div>

          {/* Sector + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Sector Tag</label>
              {isPending ? (
                <input type="text" value={form.sector_tag} onChange={(e) => update('sector_tag', e.target.value)} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }} />
              ) : (
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#fff', margin: 0 }}>{deal.sector_tag || '--'}</p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              {isPending ? (
                <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }} />
              ) : (
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#fff', margin: 0 }}>{deal.location || '--'}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            {isPending ? (
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)}
                style={{ ...inputStyle, height: '100px', resize: 'none' as const }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }} />
            ) : (
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>{deal.description || '--'}</p>
            )}
          </div>

          {/* Min Investment + Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Minimum Investment</label>
              {isPending ? (
                <input type="number" value={form.min_investment_amount} onChange={(e) => update('min_investment_amount', e.target.value)} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }} />
              ) : (
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#fff', margin: 0 }}>
                  {deal.min_investment_amount ? `${deal.currency} ${deal.min_investment_amount.toLocaleString()}` : '--'}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              {isPending ? (
                <select value={form.currency} onChange={(e) => update('currency', e.target.value)} style={inputStyle}>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                  <option value="AED">AED</option>
                  <option value="PKR">PKR</option>
                </select>
              ) : (
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#fff', margin: 0 }}>{deal.currency}</p>
              )}
            </div>
          </div>

          {/* Target Return + Timeline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Target Return</label>
              {isPending ? (
                <input type="text" value={form.target_return} onChange={(e) => update('target_return', e.target.value)} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }} />
              ) : (
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#fff', margin: 0 }}>{deal.target_return || '--'}</p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Investment Timeline</label>
              {isPending ? (
                <input type="text" value={form.investment_timeline} onChange={(e) => update('investment_timeline', e.target.value)} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }} />
              ) : (
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#fff', margin: 0 }}>{deal.investment_timeline || '--'}</p>
              )}
            </div>
          </div>

          {/* Key Highlights */}
          <div>
            <label style={labelStyle}>Key Highlights</label>
            {isPending ? (
              <input type="text" value={form.key_highlights} onChange={(e) => update('key_highlights', e.target.value)} style={inputStyle}
                placeholder="Comma-separated"
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }} />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(deal.key_highlights || []).map((h, i) => (
                  <span key={i} style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '12px',
                    color: '#C9A84C',
                    background: 'rgba(201,168,76,0.1)',
                    padding: '3px 10px',
                    borderRadius: 0,
                  }}>{h}</span>
                ))}
                {(!deal.key_highlights || deal.key_highlights.length === 0) && (
                  <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>--</span>
                )}
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <label style={labelStyle}>Documents</label>

            {documents.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {documents.map((doc) => (
                  <div key={doc.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#0e0e0e',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 0,
                    padding: '10px 14px',
                  }}>
                    <button
                      onClick={() => openFile(doc.file_url)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        minWidth: 0,
                        textDecoration: 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <span style={{ color: '#C9A84C', fontSize: '14px' }}>&#128196;</span>
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '13px',
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{doc.file_name}</span>
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.3)',
                        flexShrink: 0,
                      }}>({doc.document_type})</span>
                    </button>
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255,255,255,0.3)',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '0 4px',
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                      >&times;</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pending files for upload */}
            {isPending && pendingFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {pendingFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#0e0e0e',
                    border: '1px solid rgba(201,168,76,0.2)',
                    borderRadius: 0,
                    padding: '10px 14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ color: '#C9A84C', fontSize: '14px' }}>&#128196;</span>
                      <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#fff' }}>{file.name}</span>
                      <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                        ({(file.size / 1024).toFixed(0)} KB - pending)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '18px', padding: '0 4px', lineHeight: 1 }}
                    >&times;</button>
                  </div>
                ))}
              </div>
            )}

            {isPending && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                borderRadius: 0,
                border: '1px dashed rgba(255,255,255,0.1)',
                background: '#0e0e0e',
                cursor: 'pointer',
                transition: 'border-color 0.3s ease',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.3)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
              >
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                  + Add documents
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => {
                    const files = e.target.files
                    if (files) setPendingFiles((prev) => [...prev, ...Array.from(files)])
                    e.target.value = ''
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            )}

            {documents.length === 0 && !isPending && (
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>No documents attached.</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{
                background: 'none',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 0,
                padding: '10px 20px',
                color: '#ef4444',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              Delete Deal
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link
                href="/partner"
                style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.4)',
                  padding: '10px 20px',
                  borderRadius: 0,
                  border: '1px solid rgba(255,255,255,0.06)',
                  textDecoration: 'none',
                }}
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                style={{
                  background: saving || uploading ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)',
                  color: '#000',
                  fontFamily: "'Raleway', sans-serif",
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '10px 24px',
                  borderRadius: 0,
                  border: 'none',
                  cursor: saving || uploading ? 'not-allowed' : 'pointer',
                }}
              >
                {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
        }}>
          <div style={{
            background: '#1c1b1b',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 0,
            width: '100%',
            maxWidth: '380px',
            margin: '0 16px',
            padding: '28px',
          }}>
            <h3 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '18px',
              color: '#fff',
              margin: '0 0 8px',
            }}>Delete Deal?</h3>
            <p style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '14px',
              color: 'rgba(255,255,255,0.4)',
              margin: '0 0 24px',
            }}>
              This will permanently delete this deal and all associated documents. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(false)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 0,
                  padding: '8px 16px',
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: 0,
                  padding: '8px 16px',
                  color: '#fff',
                  fontFamily: "'Raleway', sans-serif",
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
