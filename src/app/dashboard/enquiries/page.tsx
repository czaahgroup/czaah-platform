'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

// This page also renders at /admin/my-enquiries (staff's personal work
// queue) via a re-export — keep every internal link scoped to whichever
// portal shell it's actually being viewed under.
function useEnquiriesBasePath() {
  const pathname = usePathname()
  return pathname?.startsWith('/admin') ? '/admin/my-enquiries' : '/dashboard/enquiries'
}

interface Enquiry {
  id: string
  reference_number: string
  product_name: string | null
  sector_id: string | null
  status: string
  description: string | null
  created_at: string
  member_id: string
  assigned_admin_id: string | null
  profiles?: { full_name: string; email: string }
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
  const basePath = useEnquiriesBasePath()
  return (
    <Link
      href={`${basePath}/${enq.id}`}
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

export default function EnquiriesListPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<(typeof FILTER_TABS)[number]>('All')
  const router = useRouter()
  const supabase = createClient()
  const basePath = useEnquiriesBasePath()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setUserRole(profile?.role || 'member')

        // Fetch enquiries via API
        const res = await fetch('/api/enquiries')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load enquiries')

        const enqs: Enquiry[] = json.data || []

        // Fetch sector names for each unique sector_id
        const sectorIds = [...new Set(enqs.map((e) => e.sector_id).filter(Boolean))] as string[]
        let sectorMap: Record<string, string> = {}
        if (sectorIds.length > 0) {
          const { data: sectors } = await supabase
            .from('sectors')
            .select('id, name')
            .in('id', sectorIds)
          if (sectors) {
            sectorMap = Object.fromEntries(sectors.map((s) => [s.id, s.name]))
          }
        }

        // Fetch last message for each enquiry
        const enquiryIds = enqs.map((e) => e.id)
        const lastMessages: Record<string, string> = {}
        if (enquiryIds.length > 0) {
          for (const eid of enquiryIds) {
            const { data: msgs } = await supabase
              .from('chat_messages')
              .select('content')
              .eq('enquiry_id', eid)
              .eq('is_internal_note', false)
              .order('created_at', { ascending: false })
              .limit(1)
            if (msgs && msgs.length > 0) {
              lastMessages[eid] = msgs[0].content || ''
            }
          }
        }

        const enriched = enqs.map((e) => ({
          ...e,
          sectors: e.sector_id && sectorMap[e.sector_id] ? { name: sectorMap[e.sector_id] } : null,
          last_message: lastMessages[e.id] || null,
        }))

        setEnquiries(enriched)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilter = (list: Enquiry[]) => list.filter((e) => {
    if (activeTab === 'All') return true
    if (activeTab === 'Active') return ['submitted', 'assigned', 'active'].includes(e.status)
    if (activeTab === 'Waiting') return e.status === 'waiting'
    if (activeTab === 'Resolved') return ['resolved', 'archived'].includes(e.status)
    return true
  })

  const isAdminOrSuper = userRole === 'admin' || userRole === 'super_admin'
  const assignedEnquiries = applyFilter(enquiries.filter(e => e.assigned_admin_id === userId && e.member_id !== userId))
  const myEnquiries = applyFilter(enquiries.filter(e => e.member_id === userId))
  const allFiltered = applyFilter(enquiries)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="raleway-text text-on-surface-variant/50">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="cinzel-text text-2xl text-on-surface">Enquiries</h1>
        <Link
          href={`${basePath}/new`}
          className="liquid-gold-bg text-on-primary font-semibold px-5 py-2.5 text-sm no-underline raleway-text transition-colors hover:opacity-90"
        >
          New Enquiry
        </Link>
      </div>

      {/* Filter tabs */}
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

      {isAdminOrSuper ? (
        <>
          <div className="bg-surface-container-low border border-outline-variant/10 mb-6">
            <div className="px-6 py-4 border-b border-outline-variant/10">
              <h2 className="cinzel-text text-lg text-on-surface">Assigned Enquiries</h2>
            </div>
            {assignedEnquiries.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-on-surface-variant/50 text-sm raleway-text">No enquiries assigned to you{activeTab !== 'All' ? ` (${activeTab})` : ''}.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {assignedEnquiries.map((enq) => <EnquiryRow key={enq.id} enq={enq} />)}
              </div>
            )}
          </div>

          <div className="bg-surface-container-low border border-outline-variant/10">
            <div className="px-6 py-4 border-b border-outline-variant/10">
              <h2 className="cinzel-text text-lg text-on-surface">My Enquiries</h2>
            </div>
            {myEnquiries.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-on-surface-variant/50 text-sm raleway-text">You haven&apos;t submitted any enquiries{activeTab !== 'All' ? ` (${activeTab})` : ''}.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {myEnquiries.map((enq) => <EnquiryRow key={enq.id} enq={enq} />)}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10">
          {allFiltered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-on-surface-variant/50 mb-4 raleway-text">No enquiries{activeTab !== 'All' ? ` (${activeTab})` : ''}.</p>
              <Link
                href={`${basePath}/new`}
                className="inline-block liquid-gold-bg text-on-primary font-semibold px-6 py-2.5 no-underline text-sm raleway-text"
              >
                Submit an Enquiry
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {allFiltered.map((enq) => <EnquiryRow key={enq.id} enq={enq} />)}
            </div>
          )}
        </div>
      )}
    </>
  )
}
