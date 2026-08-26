'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatPanel } from '@/components/chat/ChatPanel'


interface Enquiry {
  id: string
  reference_number: string
  product_name: string | null
  sector_id: string | null
  status: string
  assigned_admin_id: string | null
  assigned_at: string | null
  created_at: string
  member_id: string
  profiles?: { full_name: string; email: string; company_name: string | null }
}

interface AdminProfile {
  id: string
  full_name: string
  email: string
}

interface SectorAssignment {
  admin_id: string
  sector_id: string
}

interface Sector {
  id: string
  name: string
}

const STATUS_BADGES: Record<string, string> = {
  submitted: 'bg-yellow-500/20 text-yellow-400',
  assigned: 'bg-blue-500/20 text-blue-400',
  active: 'bg-green-500/20 text-green-400',
  waiting: 'bg-orange-500/20 text-orange-400',
  resolved: 'bg-neutral-500/20 text-neutral-400',
  archived: 'bg-neutral-500/20 text-neutral-400',
}

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [sectorAssignments, setSectorAssignments] = useState<SectorAssignment[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [adminMap, setAdminMap] = useState<Record<string, string>>({})
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAdminId, setSelectedAdminId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string>('super_admin')

  useEffect(() => {
    loadData()
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      setCurrentUserId(session.user.id)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role) setCurrentUserRole(profile.role)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    try {
      // Fetch enquiries and lookup data in parallel
      const [enquiriesRes, lookupRes] = await Promise.all([
        fetch('/api/enquiries'),
        fetch('/api/admin/lookup'),
      ])

      const enquiriesJson = await enquiriesRes.json()
      if (!enquiriesRes.ok) throw new Error(enquiriesJson.error || 'Failed to load enquiries')
      setEnquiries(enquiriesJson.data || [])

      const lookupJson = await lookupRes.json()
      if (!lookupRes.ok) throw new Error(lookupJson.error || 'Failed to load admin data')

      const adminData: AdminProfile[] = lookupJson.admins || []
      const sectorData: Sector[] = lookupJson.sectors || []
      const assignmentData: SectorAssignment[] = lookupJson.sectorAssignments || []

      setAdmins(adminData)
      setSectorAssignments(assignmentData)
      setSectors(sectorData)

      const aMap: Record<string, string> = {}
      adminData.forEach((a) => { aMap[a.id] = a.full_name })
      setAdminMap(aMap)

      const sMap: Record<string, string> = {}
      sectorData.forEach((s) => { sMap[s.id] = s.name })
      setSectorMap(sMap)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign(enquiryId: string) {
    if (!selectedAdminId || assigning) return
    setAssigning(true)

    try {
      const res = await fetch(`/api/enquiries/${enquiryId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: selectedAdminId }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to assign')
      }

      await loadData()
      setSelectedId(null)
      setSelectedAdminId('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setAssigning(false)
    }
  }

  const selected = enquiries.find((e) => e.id === selectedId)

  function getAdminsForSector(sectorId: string | null): AdminProfile[] {
    if (!sectorId) return admins
    const assignedAdminIds = sectorAssignments
      .filter((a) => a.sector_id === sectorId)
      .map((a) => a.admin_id)
    if (assignedAdminIds.length === 0) return admins
    return admins.filter((a) => assignedAdminIds.includes(a.id))
  }

  const filtered = enquiries
    .filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (sectorFilter !== 'all' && e.sector_id !== sectorFilter) return false
      return true
    })
    .sort((a, b) => {
      if (a.status === 'submitted' && b.status !== 'submitted') return -1
      if (a.status !== 'submitted' && b.status === 'submitted') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  if (loading) {
    return (
      <div className="text-on-surface-variant py-12 text-center">Loading enquiries...</div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Enquiries</h1>
          <button
            onClick={() => { window.open('/api/admin/export?type=enquiries', '_blank') }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: 0,
              padding: '6px 14px',
              color: '#C9A84C',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Export CSV
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/10 rounded-nonepx-3 py-1.5 text-sm text-on-surface"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="assigned">Assigned</option>
            <option value="active">Active</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/10 rounded-nonepx-3 py-1.5 text-sm text-on-surface"
          >
            <option value="all">All Sectors</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Enquiry list */}
        <div className="xl:col-span-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-16 text-center">
              <p className="text-on-surface-variant">No enquiries found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((enq) => {
                const isUnassigned = enq.status === 'submitted'
                return (
                  <button
                    key={enq.id}
                    onClick={() => {
                      setSelectedId(enq.id)
                      setSelectedAdminId(enq.assigned_admin_id || '')
                    }}
                    className={`w-full text-left rounded-none px-5 py-4 transition-colors ${
                      selectedId === enq.id
                        ? 'bg-surface-container-low border-primary border'
                        : isUnassigned
                        ? 'bg-surface-container-low border border-primary/40 hover:border-primary'
                        : 'bg-surface-container-low border border-outline-variant/10 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-medium text-on-surface truncate">
                            {enq.reference_number}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-noneshrink-0 ${STATUS_BADGES[enq.status] || ''}`}>
                            {enq.status}
                          </span>
                        </div>
                        <div className="text-xs text-on-surface-variant space-x-2">
                          {enq.profiles?.company_name && <span>{enq.profiles.company_name}</span>}
                          {enq.profiles?.full_name && <span>· {enq.profiles.full_name}</span>}
                        </div>
                        <div className="text-xs text-on-surface-variant/50 mt-1 space-x-2">
                          <span>{enq.product_name || 'General'}</span>
                          {enq.sector_id && sectorMap[enq.sector_id] && (
                            <span>· {sectorMap[enq.sector_id]}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-on-surface-variant/50">
                          {new Date(enq.created_at).toLocaleDateString()}
                        </p>
                        {enq.assigned_admin_id && adminMap[enq.assigned_admin_id] && (
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Assigned: {adminMap[enq.assigned_admin_id]}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Assignment + chat panel */}
        <div className="xl:col-span-3">
          {selected ? (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-none">
              <div className="px-6 py-4 border-b border-outline-variant/10">
                <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-1">
                  {selected.reference_number}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-none${STATUS_BADGES[selected.status] || ''}`}>
                  {selected.status}
                </span>
              </div>

              <div className="px-6 py-4 space-y-3 border-b border-outline-variant/10">
                <div>
                  <p className="text-xs text-on-surface-variant">Product</p>
                  <p className="text-sm text-on-surface">{selected.product_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Sector</p>
                  <p className="text-sm text-on-surface">
                    {selected.sector_id ? sectorMap[selected.sector_id] || 'Unknown' : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Member</p>
                  <p className="text-sm text-on-surface">
                    {selected.profiles?.full_name || 'N/A'}
                    {selected.profiles?.company_name && (
                      <span className="text-on-surface-variant/50"> ({selected.profiles.company_name})</span>
                    )}
                  </p>
                </div>
                {selected.assigned_admin_id && (
                  <div>
                    <p className="text-xs text-on-surface-variant">Currently Assigned</p>
                    <p className="text-sm text-on-surface">
                      {adminMap[selected.assigned_admin_id] || 'Unknown'}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4">
                <label className="block text-sm text-on-surface-variant mb-2">
                  {selected.assigned_admin_id ? 'Reassign to Admin' : 'Assign Admin'}
                </label>
                <select
                  value={selectedAdminId}
                  onChange={(e) => setSelectedAdminId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-sm text-on-surface mb-3"
                >
                  <option value="">Select admin...</option>
                  {getAdminsForSector(selected.sector_id).map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.full_name} ({admin.email})
                    </option>
                  ))}
                  {selected.sector_id &&
                    getAdminsForSector(selected.sector_id).length < admins.length && (
                      <>
                        <option disabled>--- Other Admins ---</option>
                        {admins
                          .filter((a) => !getAdminsForSector(selected.sector_id).find((sa) => sa.id === a.id))
                          .map((admin) => (
                            <option key={admin.id} value={admin.id}>
                              {admin.full_name} ({admin.email})
                            </option>
                          ))}
                      </>
                    )}
                </select>
                <button
                  onClick={() => handleAssign(selected.id)}
                  disabled={!selectedAdminId || assigning}
                  className="w-full bg-primary text-on-primary font-semibold py-2.5 rounded-nonetext-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {assigning
                    ? 'Assigning...'
                    : selected.assigned_admin_id
                    ? 'Reassign'
                    : 'Assign'}
                </button>
              </div>

              <div className="h-[500px] border-t border-outline-variant/10">
                <ChatPanel
                  enquiryId={selected.id}
                  currentUserId={currentUserId}
                  userRole={currentUserRole}
                />
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-none flex items-center justify-center py-16">
              <p className="text-on-surface-variant text-sm">Select an enquiry to manage assignment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
