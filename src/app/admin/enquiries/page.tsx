'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatPanel } from '@/components/chat/ChatPanel'

// One inbox for everything that comes in through the site — enquiries
// from logged-in members (which carry an assign/status pipeline and a
// live chat thread) and anonymous website messages (a one-off contact
// form / AI chat submission, no account, no pipeline) — instead of two
// separate pages that happened to look identical.
type ItemKind = 'enquiry' | 'message'

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

interface PublicMessage {
  id: string
  name: string
  email: string
  phone: string | null
  interest: string
  message: string
  source: 'contact_form' | 'ai_chat'
  status: 'new' | 'read' | 'replied'
  created_at: string
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

interface CombinedItem {
  key: string
  kind: ItemKind
  createdAt: string
  enquiry?: Enquiry
  message?: PublicMessage
}

const ENQUIRY_STATUS_BADGES: Record<string, string> = {
  submitted: 'bg-yellow-500/20 text-yellow-400',
  assigned: 'bg-blue-500/20 text-blue-400',
  active: 'bg-green-500/20 text-green-400',
  waiting: 'bg-orange-500/20 text-orange-400',
  resolved: 'bg-neutral-500/20 text-neutral-400',
  archived: 'bg-neutral-500/20 text-neutral-400',
}

const MESSAGE_STATUS_BADGES: Record<string, string> = {
  new: 'bg-yellow-500/20 text-yellow-400',
  read: 'bg-blue-500/20 text-blue-400',
  replied: 'bg-green-500/20 text-green-400',
}

const SOURCE_LABELS: Record<string, string> = {
  contact_form: 'Contact Form',
  ai_chat: 'CZAAH AI',
}

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [messages, setMessages] = useState<PublicMessage[]>([])
  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [sectorAssignments, setSectorAssignments] = useState<SectorAssignment[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [adminMap, setAdminMap] = useState<Record<string, string>>({})
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedAdminId, setSelectedAdminId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'enquiries' | 'messages'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string>('super_admin')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replySentId, setReplySentId] = useState<string | null>(null)

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
      const [enquiriesRes, lookupRes, messagesRes] = await Promise.all([
        fetch('/api/enquiries'),
        fetch('/api/admin/lookup'),
        fetch('/api/admin/messages'),
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

      const messagesJson = messagesRes.ok ? await messagesRes.json() : { data: [] }
      setMessages(messagesJson.data || [])
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setAssigning(false)
    }
  }

  async function updateMessageStatus(id: string, status: string) {
    setUpdatingId(id)
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update status')
      }
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: status as PublicMessage['status'] } : m)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  async function sendReply(id: string) {
    if (!replyText.trim() || sendingReply) return
    setSendingReply(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, replyContent: replyText.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send reply')
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'replied' } : m)))
      setReplyText('')
      setReplySentId(id)
      setTimeout(() => setReplySentId(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  function getAdminsForSector(sectorId: string | null): AdminProfile[] {
    if (!sectorId) return admins
    const assignedAdminIds = sectorAssignments
      .filter((a) => a.sector_id === sectorId)
      .map((a) => a.admin_id)
    if (assignedAdminIds.length === 0) return admins
    return admins.filter((a) => assignedAdminIds.includes(a.id))
  }

  function selectItem(item: CombinedItem) {
    setSelectedKey(item.key)
    setReplyText('')
    if (item.kind === 'enquiry') {
      setSelectedAdminId(item.enquiry!.assigned_admin_id || '')
    } else if (item.kind === 'message' && item.message!.status === 'new') {
      updateMessageStatus(item.message!.id, 'read')
    }
  }

  const filteredEnquiries = enquiries.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    if (sectorFilter !== 'all' && e.sector_id !== sectorFilter) return false
    return true
  })

  const filteredMessages = messages.filter((m) => {
    if (sourceFilter !== 'all' && m.source !== sourceFilter) return false
    return true
  })

  const items: CombinedItem[] = [
    ...(typeFilter !== 'messages' ? filteredEnquiries.map((e): CombinedItem => ({ key: `enquiry:${e.id}`, kind: 'enquiry', createdAt: e.created_at, enquiry: e })) : []),
    ...(typeFilter !== 'enquiries' ? filteredMessages.map((m): CombinedItem => ({ key: `message:${m.id}`, kind: 'message', createdAt: m.created_at, message: m })) : []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const selected = items.find((i) => i.key === selectedKey) || null

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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="bg-surface-container-low border border-outline-variant/10 px-3 py-1.5 text-sm text-on-surface"
          >
            <option value="all">All Types</option>
            <option value="enquiries">Member Enquiries</option>
            <option value="messages">Website Messages</option>
          </select>
          {typeFilter !== 'messages' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/10 px-3 py-1.5 text-sm text-on-surface"
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
                className="bg-surface-container-low border border-outline-variant/10 px-3 py-1.5 text-sm text-on-surface"
              >
                <option value="all">All Sectors</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </>
          )}
          {typeFilter !== 'enquiries' && (
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/10 px-3 py-1.5 text-sm text-on-surface"
            >
              <option value="all">All Sources</option>
              <option value="contact_form">Contact Form</option>
              <option value="ai_chat">CZAAH AI</option>
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Combined list */}
        <div className="xl:col-span-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {items.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center">
              <p className="text-on-surface-variant">Nothing found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                if (item.kind === 'enquiry') {
                  const enq = item.enquiry!
                  const isUnassigned = enq.status === 'submitted'
                  return (
                    <button
                      key={item.key}
                      onClick={() => selectItem(item)}
                      className={`w-full text-left px-5 py-4 border transition-colors ${
                        selectedKey === item.key
                          ? 'bg-surface-container-low border-primary'
                          : isUnassigned
                          ? 'bg-surface-container-low border-primary/40 hover:border-primary'
                          : 'bg-surface-container-low border-outline-variant/10 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-on-surface truncate">{enq.reference_number}</span>
                            <span className={`text-xs px-2 py-0.5 shrink-0 ${ENQUIRY_STATUS_BADGES[enq.status] || ''}`}>{enq.status}</span>
                            <span className="text-xs px-2 py-0.5 shrink-0 bg-primary/10 text-primary">Enquiry</span>
                          </div>
                          <div className="text-xs text-on-surface-variant space-x-2">
                            {enq.profiles?.company_name && <span>{enq.profiles.company_name}</span>}
                            {enq.profiles?.full_name && <span>· {enq.profiles.full_name}</span>}
                          </div>
                          <div className="text-xs text-on-surface-variant/50 mt-1 space-x-2">
                            <span>{enq.product_name || 'General'}</span>
                            {enq.sector_id && sectorMap[enq.sector_id] && <span>· {sectorMap[enq.sector_id]}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-on-surface-variant/50">{new Date(enq.created_at).toLocaleDateString()}</p>
                          {enq.assigned_admin_id && adminMap[enq.assigned_admin_id] && (
                            <p className="text-xs text-on-surface-variant mt-0.5">Assigned: {adminMap[enq.assigned_admin_id]}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                }

                const m = item.message!
                return (
                  <button
                    key={item.key}
                    onClick={() => selectItem(item)}
                    className={`w-full text-left px-5 py-4 border transition-colors ${
                      selectedKey === item.key
                        ? 'bg-surface-container-low border-primary'
                        : m.status === 'new'
                        ? 'bg-surface-container-low border-primary/40 hover:border-primary'
                        : 'bg-surface-container-low border-outline-variant/10 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-on-surface truncate">{m.name}</span>
                          <span className={`text-xs px-2 py-0.5 shrink-0 ${MESSAGE_STATUS_BADGES[m.status] || ''}`}>{m.status}</span>
                          <span className="text-xs px-2 py-0.5 shrink-0 bg-primary/10 text-primary">{SOURCE_LABELS[m.source] || m.source}</span>
                        </div>
                        <div className="text-xs text-on-surface-variant/60 truncate">{m.interest}</div>
                      </div>
                      <div className="text-xs text-on-surface-variant/50 shrink-0">{new Date(m.created_at).toLocaleDateString()}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="xl:col-span-3">
          {!selected ? (
            <div className="bg-surface-container-low border border-outline-variant/10 flex items-center justify-center py-16">
              <p className="text-on-surface-variant text-sm">Select an item to view details.</p>
            </div>
          ) : selected.kind === 'enquiry' ? (
            <div className="bg-surface-container-low border border-outline-variant/10">
              <div className="px-6 py-4 border-b border-outline-variant/10">
                <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-1">
                  {selected.enquiry!.reference_number}
                </h2>
                <span className={`text-xs px-2 py-0.5 ${ENQUIRY_STATUS_BADGES[selected.enquiry!.status] || ''}`}>
                  {selected.enquiry!.status}
                </span>
              </div>

              <div className="px-6 py-4 space-y-3 border-b border-outline-variant/10">
                <div>
                  <p className="text-xs text-on-surface-variant">Product</p>
                  <p className="text-sm text-on-surface">{selected.enquiry!.product_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Sector</p>
                  <p className="text-sm text-on-surface">
                    {selected.enquiry!.sector_id ? sectorMap[selected.enquiry!.sector_id] || 'Unknown' : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Member</p>
                  <p className="text-sm text-on-surface">
                    {selected.enquiry!.profiles?.full_name || 'N/A'}
                    {selected.enquiry!.profiles?.company_name && (
                      <span className="text-on-surface-variant/50"> ({selected.enquiry!.profiles.company_name})</span>
                    )}
                  </p>
                </div>
                {selected.enquiry!.assigned_admin_id && (
                  <div>
                    <p className="text-xs text-on-surface-variant">Currently Assigned</p>
                    <p className="text-sm text-on-surface">{adminMap[selected.enquiry!.assigned_admin_id] || 'Unknown'}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4">
                <label className="block text-sm text-on-surface-variant mb-2">
                  {selected.enquiry!.assigned_admin_id ? 'Reassign to Admin' : 'Assign Admin'}
                </label>
                <select
                  value={selectedAdminId}
                  onChange={(e) => setSelectedAdminId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 px-4 py-2.5 text-sm text-on-surface mb-3"
                >
                  <option value="">Select admin...</option>
                  {getAdminsForSector(selected.enquiry!.sector_id).map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.full_name} ({admin.email})
                    </option>
                  ))}
                  {selected.enquiry!.sector_id &&
                    getAdminsForSector(selected.enquiry!.sector_id).length < admins.length && (
                      <>
                        <option disabled>--- Other Admins ---</option>
                        {admins
                          .filter((a) => !getAdminsForSector(selected.enquiry!.sector_id).find((sa) => sa.id === a.id))
                          .map((admin) => (
                            <option key={admin.id} value={admin.id}>
                              {admin.full_name} ({admin.email})
                            </option>
                          ))}
                      </>
                    )}
                </select>
                <button
                  onClick={() => handleAssign(selected.enquiry!.id)}
                  disabled={!selectedAdminId || assigning}
                  className="w-full bg-primary text-on-primary font-semibold py-2.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : selected.enquiry!.assigned_admin_id ? 'Reassign' : 'Assign'}
                </button>
              </div>

              <div className="h-[500px] border-t border-outline-variant/10">
                <ChatPanel
                  enquiryId={selected.enquiry!.id}
                  currentUserId={currentUserId}
                  userRole={currentUserRole}
                />
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-low border border-outline-variant/10">
              <div className="px-6 py-4 border-b border-outline-variant/10">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">{selected.message!.name}</h2>
                  <span className={`text-xs px-2 py-0.5 shrink-0 ${MESSAGE_STATUS_BADGES[selected.message!.status] || ''}`}>{selected.message!.status}</span>
                </div>
                <div className="text-xs text-on-surface-variant space-x-2">
                  <span>{selected.message!.email}</span>
                  {selected.message!.phone && <span>· {selected.message!.phone}</span>}
                  <span>· {new Date(selected.message!.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="px-6 py-4 space-y-3 border-b border-outline-variant/10">
                <div>
                  <p className="text-xs text-on-surface-variant">Interest</p>
                  <p className="text-sm text-on-surface">{selected.message!.interest}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Message</p>
                  <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{selected.message!.message}</p>
                </div>
              </div>

              <div className="px-6 py-4">
                <label className="block text-sm text-on-surface-variant mb-2">Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Type a reply to ${selected.message!.name}...`}
                  rows={4}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 px-4 py-2.5 text-sm text-on-surface mb-3 resize-none"
                />
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    onClick={() => sendReply(selected.message!.id)}
                    disabled={sendingReply || !replyText.trim()}
                    className="text-sm px-5 py-2.5 bg-primary text-on-primary font-semibold disabled:opacity-50 transition-opacity"
                  >
                    {sendingReply ? 'Sending...' : replySentId === selected.message!.id ? 'Sent ✓' : 'Send Reply'}
                  </button>
                  <a
                    href={`mailto:${selected.message!.email}`}
                    className="text-sm px-4 py-2.5 border border-primary/40 text-primary hover:border-primary transition-colors"
                  >
                    Reply by Email
                  </a>
                  {selected.message!.status !== 'replied' && (
                    <button
                      onClick={() => updateMessageStatus(selected.message!.id, 'replied')}
                      disabled={updatingId === selected.message!.id}
                      className="text-sm px-4 py-2.5 border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 transition-colors disabled:opacity-40"
                    >
                      Mark as Replied
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
