'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { openFile } from '@/lib/utils/openFile'

export const runtime = 'edge';

interface Attachment {
  id: string
  file_url: string
  file_name: string
  uploaded_at: string
}

interface EnquiryDetail {
  id: string
  reference_number: string
  product_name: string | null
  description: string | null
  estimated_quantity: string | null
  timeline: string | null
  additional_notes: string | null
  status: string
  sector_id: string | null
  member_id: string
  assigned_admin_id: string | null
  created_at: string
  resolved_at: string | null
  member: { id: string; full_name: string; email: string; role: string } | null
  attachments: Attachment[]
}

const STATUS_BADGES: Record<string, string> = {
  submitted: 'bg-primary/10 text-primary',
  assigned: 'bg-tertiary/10 text-tertiary',
  active: 'bg-green-500/10 text-green-400',
  waiting: 'bg-orange-500/10 text-orange-400',
  resolved: 'bg-on-surface/10 text-on-surface-variant',
  archived: 'bg-on-surface/5 text-on-surface-variant/50',
}

const TIMELINE_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  '1_3_months': '1-3 Months',
  '3_6_months': '3-6 Months',
  '6_plus_months': '6+ Months',
  flexible: 'Flexible',
}

export default function PartnerEnquiryDetailPage() {
  const params = useParams()
  const enquiryId = params.id as string
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null)
  const [sectorName, setSectorName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        setUserName(profile?.full_name || '')

        const res = await fetch(`/api/enquiries/${enquiryId}`)
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'Enquiry not found'); setLoading(false); return }
        setEnquiry(json.data)

        if (json.data.sector_id) {
          const { data: sector } = await supabase.from('sectors').select('name').eq('id', json.data.sector_id).single()
          if (sector) setSectorName(sector.name)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [enquiryId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResolve() {
    if (!enquiry || resolving) return
    setResolving(true)
    try {
      const res = await fetch(`/api/enquiries/${enquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      })
      const json = await res.json()
      if (res.ok) setEnquiry({ ...enquiry, status: 'resolved', resolved_at: json.data.resolved_at })
    } finally {
      setResolving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="raleway-text text-on-surface-variant/50">Loading...</div>
      </div>
    )
  }

  if (error || !enquiry) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-error mb-4">{error || 'Enquiry not found'}</p>
          <Link href="/partner-network/enquiries" className="text-sm text-primary hover:underline no-underline">
            &larr; Back to Enquiries
          </Link>
        </div>
      </div>
    )
  }

  const canResolve = enquiry.status !== 'resolved' && enquiry.status !== 'archived'

  return (
    <>
      <Link
        href="/partner-network/enquiries"
        className="text-sm text-on-surface-variant/50 hover:text-primary transition-colors mb-6 inline-block raleway-text no-underline"
      >
        &larr; Back to Enquiries
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Enquiry details */}
        <div className="lg:col-span-2">
          <div className="bg-surface-container-low border border-outline-variant/10">
            <div className="px-6 py-4 border-b border-outline-variant/10">
              <div className="flex items-center justify-between mb-2">
                <h1 className="cinzel-text text-lg text-on-surface">Enquiry Details</h1>
                <span className={`text-xs px-2 py-0.5 ${STATUS_BADGES[enquiry.status] || ''}`}>{enquiry.status}</span>
              </div>
              <p className="text-xs text-on-surface-variant/40 raleway-text">{enquiry.reference_number}</p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <DetailRow label="Member" value={enquiry.member?.full_name || 'N/A'} />
              <DetailRow label="Product" value={enquiry.product_name || 'N/A'} />
              {sectorName && <DetailRow label="Sector" value={sectorName} />}
              <DetailRow label="Description" value={enquiry.description || 'N/A'} />
              <DetailRow label="Quantity" value={enquiry.estimated_quantity || 'N/A'} />
              <DetailRow label="Timeline" value={TIMELINE_LABELS[enquiry.timeline || ''] || enquiry.timeline || 'N/A'} />
              {enquiry.additional_notes && <DetailRow label="Notes" value={enquiry.additional_notes} />}
              <DetailRow label="Created" value={new Date(enquiry.created_at).toLocaleDateString()} />
              {enquiry.resolved_at && <DetailRow label="Resolved" value={new Date(enquiry.resolved_at).toLocaleDateString()} />}

              {enquiry.attachments.length > 0 && (
                <div>
                  <p className="text-xs text-on-surface-variant/50 uppercase tracking-wider mb-2 raleway-text">Attachments</p>
                  <div className="space-y-1">
                    {enquiry.attachments.map((att) => (
                      <button
                        key={att.id}
                        onClick={() => openFile(att.file_url)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        className="flex items-center gap-2 text-sm text-primary hover:underline raleway-text"
                      >
                        <span className="truncate">{att.file_name}</span>
                        <span className="text-on-surface-variant/40 shrink-0">&rarr;</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {canResolve && (
              <div className="px-6 py-4 border-t border-outline-variant/10">
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="w-full bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-primary/30 font-semibold py-2.5 text-sm transition-colors disabled:opacity-50 raleway-text"
                >
                  {resolving ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat panel */}
        <div className="lg:col-span-3">
          <div className="bg-surface-container-low border border-outline-variant/10 h-[600px] flex flex-col">
            <div className="px-6 py-3 border-b border-outline-variant/10">
              <h2 className="cinzel-text text-sm text-on-surface">Chat</h2>
            </div>
            <div className="flex-1 min-h-0">
              <ChatPanel
                enquiryId={enquiryId}
                currentUserId={userId || ''}
                currentUserName={userName}
                userRole="partner"
                enableCalls={!!enquiry.member}
                targetUserId={enquiry.member?.id}
                targetName={enquiry.member?.full_name}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-on-surface-variant/50 uppercase tracking-wider mb-0.5 raleway-text">{label}</p>
      <p className="text-sm text-on-surface whitespace-pre-wrap raleway-text">{value}</p>
    </div>
  )
}
