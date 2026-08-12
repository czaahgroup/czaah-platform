'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { openFile } from '@/lib/utils/openFile'

interface KycDocument { id: string; document_type: string; file_url: string; status: string; created_at: string }
interface SharedDocument { id: string; title: string; file_url: string; shared_at: string; enquiry_id: string | null; enquiries?: { reference_number: string } | null }

const DOC_STATUS: Record<string, string> = { pending: 'bg-primary/10 text-primary', approved: 'bg-green-500/10 text-green-400', rejected: 'bg-error/10 text-error' }

export default function DocumentsPage() {
  const [kycDocs, setKycDocs] = useState<KycDocument[]>([])
  const [sharedDocs, setSharedDocs] = useState<SharedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingDoc, setViewingDoc] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: kyc } = await supabase.from('kyc_documents').select('id, document_type, file_url, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
      setKycDocs(kyc || [])
      const { data: shared } = await supabase.from('shared_documents').select('id, title, file_url, shared_at, enquiry_id, enquiries(reference_number)').eq('shared_with', user.id).order('shared_at', { ascending: false })
      setSharedDocs((shared as unknown as SharedDocument[]) || [])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function viewKycDocument(fileUrl: string) {
    setViewingDoc(fileUrl)
    try { await openFile(fileUrl, 'kyc-documents') } catch {} finally { setViewingDoc(null) }
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
                <div key={doc.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface raleway-text">{formatDocType(doc.document_type)}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 ${DOC_STATUS[doc.status] || 'bg-on-surface/5 text-on-surface-variant/50'}`}>{doc.status}</span>
                      <span className="text-xs text-on-surface-variant/40 raleway-text">Uploaded {new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => viewKycDocument(doc.file_url)} disabled={viewingDoc === doc.file_url} className="text-sm bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface px-4 py-1.5 transition-colors disabled:opacity-50 cursor-pointer raleway-text">{viewingDoc === doc.file_url ? 'Opening...' : 'View'}</button>
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
                <div key={doc.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface raleway-text">{doc.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant/40 raleway-text">
                      {doc.enquiries?.reference_number && <><span>Enquiry: {doc.enquiries.reference_number}</span><span>&middot;</span></>}
                      <span>Shared {new Date(doc.shared_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => openFile(doc.file_url)} className="text-sm bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface px-4 py-1.5 transition-colors cursor-pointer raleway-text">View</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
