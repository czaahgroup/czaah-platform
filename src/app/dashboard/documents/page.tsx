'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface KycDocument { id: string; document_type: string; file_url: string; status: string; created_at: string }
interface SharedDocument { id: string; title: string; file_url: string; shared_at: string; enquiry_id: string | null; enquiries?: { reference_number: string } | null }
interface Thumb { url: string; contentType: string | null }

const DOC_STATUS: Record<string, string> = { pending: 'bg-primary/10 text-primary', approved: 'bg-green-500/10 text-green-400', rejected: 'bg-error/10 text-error' }

function Thumbnail({ thumb }: { thumb: Thumb | undefined }) {
  if (!thumb) {
    return (
      <div className="w-14 h-14 rounded bg-surface-container flex items-center justify-center shrink-0 animate-pulse">
        <span className="material-symbols-outlined text-on-surface-variant/20" style={{ fontSize: '20px' }}>description</span>
      </div>
    )
  }
  if (thumb.contentType?.startsWith('image/')) {
    return (
      <div className="w-14 h-14 rounded overflow-hidden shrink-0 border border-outline-variant/10">
        <img src={thumb.url} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className="w-14 h-14 rounded bg-surface-container flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: '22px' }}>
        {thumb.contentType === 'application/pdf' ? 'picture_as_pdf' : 'description'}
      </span>
    </div>
  )
}

export default function DocumentsPage() {
  const [kycDocs, setKycDocs] = useState<KycDocument[]>([])
  const [sharedDocs, setSharedDocs] = useState<SharedDocument[]>([])
  const [thumbs, setThumbs] = useState<Record<string, Thumb>>({})
  const [loading, setLoading] = useState(true)
  const [openingKey, setOpeningKey] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ title: string; url: string; status?: string; date?: string; contentType: string | null } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function loadThumbnail(id: string, fileUrl: string, bucket: string) {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(fileUrl)}&bucket=${encodeURIComponent(bucket)}`)
      if (!res.ok) return
      const { url } = await res.json()

      let contentType: string | null = null
      try {
        const headRes = await fetch(url, { method: 'HEAD' })
        contentType = headRes.headers.get('content-type')
      } catch {
        // leave contentType null — thumbnail falls back to a generic file icon
      }

      setThumbs(prev => ({ ...prev, [id]: { url, contentType } }))
    } catch {
      // leave this document without a thumbnail — the row still shows a generic icon
    }
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: kyc } = await supabase.from('kyc_documents').select('id, document_type, file_url, status:review_status, created_at:uploaded_at').eq('user_id', user.id).order('uploaded_at', { ascending: false })
      setKycDocs(kyc || [])
      const { data: shared } = await supabase.from('shared_documents').select('id, title, file_url, shared_at, enquiry_id, enquiries(reference_number)').eq('shared_with', user.id).order('shared_at', { ascending: false })
      setSharedDocs((shared as unknown as SharedDocument[]) || [])
      setLoading(false)

      // Load thumbnails in the background — don't block the list from rendering
      for (const doc of kyc || []) loadThumbnail(doc.id, doc.file_url, 'kyc-documents')
      for (const doc of (shared as unknown as SharedDocument[]) || []) loadThumbnail(doc.id, doc.file_url, 'platform-files')
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openPreviewFromThumb(id: string, title: string, status?: string, date?: string) {
    const thumb = thumbs[id]
    if (!thumb) return
    setPreview({ title, url: thumb.url, status, date, contentType: thumb.contentType })
  }

  async function openPreview(key: string, title: string, fileUrl: string, bucket: string, status?: string, date?: string) {
    const cached = thumbs[key]
    if (cached) {
      setPreview({ title, url: cached.url, status, date, contentType: cached.contentType })
      return
    }
    setOpeningKey(key)
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(fileUrl)}&bucket=${encodeURIComponent(bucket)}`)
      if (!res.ok) return
      const { url } = await res.json()

      let contentType: string | null = null
      try {
        const headRes = await fetch(url, { method: 'HEAD' })
        contentType = headRes.headers.get('content-type')
      } catch {
        // fall through with contentType null — preview falls back to the generic viewer
      }

      setPreview({ title, url, status, date, contentType })
    } catch {
      // ignore — button just stops showing "Opening..."
    } finally {
      setOpeningKey(null)
    }
  }

  function formatDocType(type: string) { return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="raleway-text text-on-surface-variant/50">Loading...</div></div>

  return (
    <>
      <div className="mb-6"><h1 className="cinzel-text text-2xl text-on-surface">Documents</h1></div>
      <div className="space-y-8">
        <div className="bg-surface-container-low border border-outline-variant/10">
          <div className="px-6 py-4 border-b border-outline-variant/10"><h2 className="cinzel-text text-lg text-on-surface">KYC Documents</h2></div>
          {kycDocs.length === 0 ? (
            <div className="px-6 py-12 text-center"><p className="text-on-surface-variant/50 raleway-text">No KYC documents uploaded.</p></div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {kycDocs.map((doc) => (
                <div key={doc.id} className="px-6 py-4 flex items-center gap-4 justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <button
                      onClick={() => openPreviewFromThumb(doc.id, formatDocType(doc.document_type), doc.status, doc.created_at)}
                      className="bg-transparent border-none p-0 cursor-pointer"
                      aria-label="Preview document"
                    >
                      <Thumbnail thumb={thumbs[doc.id]} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface raleway-text truncate">{formatDocType(doc.document_type)}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 ${DOC_STATUS[doc.status] || 'bg-on-surface/5 text-on-surface-variant/50'}`}>{doc.status}</span>
                        <span className="text-xs text-on-surface-variant/40 raleway-text">Uploaded {new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => openPreview(doc.id, formatDocType(doc.document_type), doc.file_url, 'kyc-documents', doc.status, doc.created_at)} disabled={openingKey === doc.id} className="text-sm bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface px-4 py-1.5 transition-colors disabled:opacity-50 cursor-pointer raleway-text shrink-0">{openingKey === doc.id ? 'Opening...' : 'View'}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10">
          <div className="px-6 py-4 border-b border-outline-variant/10"><h2 className="cinzel-text text-lg text-on-surface">Shared Documents</h2></div>
          {sharedDocs.length === 0 ? (
            <div className="px-6 py-12 text-center"><p className="text-on-surface-variant/50 raleway-text">No documents have been shared with you yet.</p></div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {sharedDocs.map((doc) => (
                <div key={doc.id} className="px-6 py-4 flex items-center gap-4 justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <button
                      onClick={() => openPreviewFromThumb(doc.id, doc.title, undefined, doc.shared_at)}
                      className="bg-transparent border-none p-0 cursor-pointer"
                      aria-label="Preview document"
                    >
                      <Thumbnail thumb={thumbs[doc.id]} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface raleway-text truncate">{doc.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant/40 raleway-text">
                        {doc.enquiries?.reference_number && <><span>Enquiry: {doc.enquiries.reference_number}</span><span>&middot;</span></>}
                        <span>Shared {new Date(doc.shared_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => openPreview(doc.id, doc.title, doc.file_url, 'platform-files', undefined, doc.shared_at)} disabled={openingKey === doc.id} className="text-sm bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface px-4 py-1.5 transition-colors disabled:opacity-50 cursor-pointer raleway-text shrink-0">{openingKey === doc.id ? 'Opening...' : 'View'}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-5"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPreview(null) }}
        >
          <div className="w-full flex flex-col" style={{ maxWidth: '640px', maxHeight: '90vh', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
            <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="raleway-text text-sm font-medium text-on-surface m-0">{preview.title}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  {preview.status && (
                    <span className={`text-xs px-2 py-0.5 ${DOC_STATUS[preview.status] || 'bg-on-surface/5 text-on-surface-variant/50'}`}>{preview.status}</span>
                  )}
                  {preview.date && (
                    <span className="raleway-text text-xs text-on-surface-variant/40">{new Date(preview.date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setPreview(null)} aria-label="Close" className="cursor-pointer bg-transparent border-none text-on-surface-variant hover:text-on-surface shrink-0" style={{ fontSize: '20px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
            </div>

            <div style={{ flex: 1, minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', padding: '24px', overflow: 'auto' }}>
              {preview.contentType?.startsWith('image/') ? (
                <img
                  src={preview.url}
                  alt={preview.title}
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
                />
              ) : preview.contentType === 'application/pdf' ? (
                <iframe src={preview.url} title={preview.title} style={{ width: '100%', height: '60vh', border: 'none', borderRadius: '8px', background: '#fff' }} />
              ) : (
                <div className="text-center">
                  <span className="material-symbols-outlined text-on-surface-variant/30" style={{ fontSize: '48px' }}>description</span>
                  <p className="raleway-text text-sm text-on-surface-variant/50 mt-3">Preview isn&apos;t available for this file type.</p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <a href={preview.url} target="_blank" rel="noopener noreferrer" className="raleway-text text-xs text-primary hover:underline">Open in New Tab</a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
