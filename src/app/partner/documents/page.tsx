'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import { openFile } from '@/lib/utils/openFile'

interface Deal {
  id: string
  title: string
  approval_status: string
}

interface Doc {
  id: string
  document_type: string
  file_url: string
  file_name: string
  uploaded_at: string
}

interface DealWithDocs {
  deal: Deal
  documents: Doc[]
}

export default function PartnerDocumentsPage() {
  const [dealDocs, setDealDocs] = useState<DealWithDocs[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/partner/deals')
      if (!res.ok) return
      const deals: Deal[] = await res.json()

      const results: DealWithDocs[] = []
      for (const deal of deals) {
        try {
          const docRes = await fetch(`/api/partner/deals/${deal.id}`)
          if (docRes.ok) {
            const data = await docRes.json()
            if (data.documents && data.documents.length > 0) {
              results.push({ deal, documents: data.documents })
            }
          }
        } catch { /* skip */ }
      }
      setDealDocs(results)
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ fontFamily: "'Raleway', sans-serif", color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading documents...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '24px',
        color: '#fff',
        margin: '0 0 8px',
      }}>Documents</h1>
      <p style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize: '14px',
        color: 'rgba(255,255,255,0.4)',
        margin: '0 0 32px',
      }}>All documents across your submitted deals.</p>

      {dealDocs.length === 0 ? (
        <div style={{
          background: '#1c1b1b',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 0,
          padding: '60px 20px',
          textAlign: 'center',
        }}>
          <p style={{ fontFamily: "'Raleway', sans-serif", color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>
            No documents uploaded yet. Documents will appear here once you attach them to your deals.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {dealDocs.map(({ deal, documents }) => (
            <div key={deal.id} style={{
              background: '#1c1b1b',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 0,
              padding: '20px 24px',
            }}>
              <h3 style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '15px',
                color: '#fff',
                margin: '0 0 12px',
              }}>{deal.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => openFile(doc.file_url)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#0e0e0e',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 0,
                      padding: '10px 14px',
                      textDecoration: 'none',
                      transition: 'border-color 0.3s ease',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.2)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}
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
                    <span style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.2)',
                      marginLeft: 'auto',
                      flexShrink: 0,
                    }}>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
