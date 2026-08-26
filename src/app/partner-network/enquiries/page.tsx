'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export const runtime = 'edge';

interface Enquiry {
  id: string
  reference_number: string
  product_name: string | null
  sector_id: string | null
  status: string
  created_at: string
  profiles?: { full_name: string; email: string; company_name: string | null } | null
  sectors?: { name: string } | null
  last_message?: string | null
}

const STATUS_BADGES: Record<string, string> = {
  submitted: 'bg-primary/10 text-primary',
  assigned: 'bg-tertiary/10 text-tertiary',
  active: 'bg-green-500/10 text-green-400',
  waiting: 'bg-orange-500/10 text-orange-400',
  resolved: 'bg-on-surface/10 text-on-surface-variant',
  archived: 'bg-on-surface/5 text-on-surface-variant/50',
}

const FILTER_TABS = ['All', 'Active', 'Waiting', 'Resolved'] as const

function EnquiryRow({ enq }: { enq: Enquiry }) {
  return (
    <Link
      href={`/partner-network/enquiries/${enq.id}`}
      className="block px-6 py-4 hover:bg-surface-container transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-medium text-on-surface truncate raleway-text">
              {enq.product_name || 'General Enquiry'}
            </span>
            <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_BADGES[enq.status] || ''}`}>
              {enq.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-on-surface-variant/40">
            <span>{enq.reference_number}</span>
            {enq.sectors?.name && (
              <>
                <span>&middot;</span>
                <span>{enq.sectors.name}</span>
              </>
            )}
            {enq.profiles?.full_name && (
              <>
                <span>&middot;</span>
                <span>{enq.profiles.full_name}</span>
              </>
            )}
          </div>
          {enq.last_message && (
            <p className="text-xs text-on-surface-variant/50 mt-1 truncate max-w-md raleway-text">
              {enq.last_message}
            </p>
          )}
        </div>
        <span className="text-xs text-on-surface-variant/40 shrink-0 raleway-text">
          {new Date(enq.created_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  )
}

export default function PartnerEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<(typeof FILTER_TABS)[number]>('All')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const res = await fetch('/api/enquiries')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load enquiries')

        const enqs: Enquiry[] = json.data || []

        const sectorIds = [...new Set(enqs.map((e) => e.sector_id).filter(Boolean))] as string[]
        let sectorMap: Record<string, string> = {}
        if (sectorIds.length > 0) {
          const { data: sectors } = await supabase.from('sectors').select('id, name').in('id', sectorIds)
          if (sectors) sectorMap = Object.fromEntries(sectors.map((s) => [s.id, s.name]))
        }

        const lastMessages: Record<string, string> = {}
        for (const e of enqs) {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('content')
            .eq('enquiry_id', e.id)
            .eq('is_internal_note', false)
            .order('created_at', { ascending: false })
            .limit(1)
          if (msgs && msgs.length > 0) lastMessages[e.id] = msgs[0].content || ''
        }

        setEnquiries(enqs.map((e) => ({
          ...e,
          sectors: e.sector_id && sectorMap[e.sector_id] ? { name: sectorMap[e.sector_id] } : null,
          last_message: lastMessages[e.id] || null,
        })))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = enquiries.filter((e) => {
    if (activeTab === 'All') return true
    if (activeTab === 'Active') return ['submitted', 'assigned', 'active'].includes(e.status)
    if (activeTab === 'Waiting') return e.status === 'waiting'
    if (activeTab === 'Resolved') return ['resolved', 'archived'].includes(e.status)
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="raleway-text text-on-surface-variant/50">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="cinzel-text text-2xl text-on-surface">Enquiries</h1>
        <p className="text-sm text-on-surface-variant/50 mt-1 raleway-text">Member enquiries assigned to you.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm whitespace-nowrap transition-colors raleway-text ${
              activeTab === tab
                ? 'liquid-gold-bg text-on-primary font-semibold'
                : 'bg-surface-container border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 px-4 py-3 mb-6">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <div className="bg-surface-container-low border border-outline-variant/10">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-on-surface-variant/50 raleway-text">
              {enquiries.length === 0 ? 'No enquiries assigned to you yet.' : `No enquiries (${activeTab}).`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {filtered.map((enq) => <EnquiryRow key={enq.id} enq={enq} />)}
          </div>
        )}
      </div>
    </>
  )
}
