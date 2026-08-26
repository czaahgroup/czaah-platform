'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMemberCall } from '@/lib/contexts/MemberCallContext'
import { usePartnerCall } from '@/lib/contexts/PartnerCallContext'
import { useStaffCall } from '@/lib/contexts/StaffCallContext'

// One inbox for every contact — regular members (all account roles),
// Partner Network partners, AND fellow staff (admin/super_admin) — so
// there's a single place to message or call anyone, instead of separate
// pages backed by separate tables (registrant_chats, partner_chats,
// admin_chats).
type ContactKind = 'member' | 'partner' | 'staff'

interface RegistrantChat {
  id: string
  profile_id: string | null
  last_message_at: string | null
  profiles: { full_name: string; email: string; role: string; company_name: string | null } | null
}

interface PartnerChat {
  id: string
  last_message_at: string | null
  partners: { profile_id: string | null; profiles: { full_name: string; email: string } | null } | null
}

interface StaffProfile {
  id: string
  full_name: string
  role: string
}

interface StaffChat {
  id: string
  other_user_id: string
  last_message_at: string | null
}

interface Contact {
  // null for a staff colleague you haven't started a chat with yet — the
  // chat is created lazily the first time you open them.
  chatId: string | null
  kind: ContactKind
  name: string
  subLabel: string
  lastMessageAt: string | null
  profileId: string | null
}

interface Message {
  id: string
  chat_id?: string
  sender_id: string
  content: string
  created_at: string
}

const roleLabels: Record<string, string> = {
  elite_member: 'Elite Member',
  investment_partner: 'Investment Partner',
  real_estate_partner: 'Real Estate Partner',
  worker: 'Worker',
  employer: 'Employer',
  oep_partner: 'Employment Promoter',
}

function contactKey(kind: ContactKind, profileId: string | null, chatId: string | null) {
  return `${kind}:${profileId || chatId}`
}

function messagesUrl(kind: ContactKind, chatId: string) {
  if (kind === 'staff') return `/api/admin/contacts/${chatId}`
  if (kind === 'partner') return `/api/admin/partner-messages?chat_id=${chatId}`
  return `/api/admin/registrant-messages?chat_id=${chatId}`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminLiveChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [activeKind, setActiveKind] = useState<ContactKind | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [clearingHistory, setClearingHistory] = useState(false)
  const memberCall = useMemberCall()
  const partnerCall = usePartnerCall()
  const staffCall = useStaffCall()

  const selectedContact = contacts.find((c) => contactKey(c.kind, c.profileId, c.chatId) === selectedKey) || null

  useEffect(() => {
    loadContacts()
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null
      setUserId(uid)
      if (uid) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).single()
        setUserRole(profile?.role || null)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadContacts() {
    try {
      const [registrantRes, partnerRes, staffRes] = await Promise.all([
        fetch('/api/admin/registrant-messages'),
        fetch('/api/admin/partner-messages'),
        fetch('/api/admin/contacts'),
      ])
      const registrantJson = registrantRes.ok ? await registrantRes.json() : { data: [] }
      const partnerJson = partnerRes.ok ? await partnerRes.json() : { data: [] }
      const staffJson = staffRes.ok ? await staffRes.json() : { data: { admins: [], chats: [] } }

      const memberContacts: Contact[] = ((registrantJson.data || []) as RegistrantChat[]).map((c) => ({
        chatId: c.id,
        kind: 'member',
        name: c.profiles?.full_name || 'Member',
        subLabel: roleLabels[c.profiles?.role || ''] || c.profiles?.role || 'Member',
        lastMessageAt: c.last_message_at,
        profileId: c.profile_id,
      }))

      const partnerContacts: Contact[] = ((partnerJson.data || []) as PartnerChat[]).map((c) => ({
        chatId: c.id,
        kind: 'partner',
        name: c.partners?.profiles?.full_name || 'Partner',
        subLabel: 'Partner Network',
        lastMessageAt: c.last_message_at,
        profileId: c.partners?.profile_id || null,
      }))

      const staffAdmins: StaffProfile[] = staffJson.data?.admins || []
      const staffChats: StaffChat[] = staffJson.data?.chats || []
      const staffChatByUser = new Map(staffChats.map((c) => [c.other_user_id, c]))
      const staffContacts: Contact[] = staffAdmins.map((a) => {
        const chat = staffChatByUser.get(a.id)
        return {
          chatId: chat?.id || null,
          kind: 'staff' as const,
          name: a.full_name,
          subLabel: a.role === 'super_admin' ? 'Super Admin' : 'Admin',
          lastMessageAt: chat?.last_message_at || null,
          profileId: a.id,
        }
      })

      const combined = [...memberContacts, ...partnerContacts, ...staffContacts].sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0
        if (!a.lastMessageAt) return 1
        if (!b.lastMessageAt) return -1
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      })

      setContacts(combined)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function openChat(contact: Contact) {
    const key = contactKey(contact.kind, contact.profileId, contact.chatId)
    setSelectedKey(key)
    setLoadingMessages(true)
    try {
      let chatId = contact.chatId
      if (contact.kind === 'staff' && !chatId) {
        const res = await fetch('/api/admin/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: contact.profileId }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to open chat')
        chatId = json.data.id
        setContacts((prev) => prev.map((c) => (contactKey(c.kind, c.profileId, c.chatId) === key ? { ...c, chatId } : c)))
      }
      setActiveChatId(chatId)
      setActiveKind(contact.kind)

      const res = await fetch(messagesUrl(contact.kind, chatId!))
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load thread')
      setMessages(contact.kind === 'staff' ? json.data.messages || [] : json.data || [])
      await loadContacts()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load thread')
    } finally {
      setLoadingMessages(false)
    }
  }

  async function sendReply() {
    if (!reply.trim() || !activeChatId || !activeKind || sending) return
    setSending(true)
    try {
      const url = activeKind === 'staff' ? `/api/admin/contacts/${activeChatId}/messages` : activeKind === 'partner' ? '/api/admin/partner-messages' : '/api/admin/registrant-messages'
      const body = activeKind === 'staff' ? { content: reply.trim() } : { chatId: activeChatId, content: reply.trim() }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      setMessages((prev) => [...prev, json.data])
      setReply('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  async function clearHistory() {
    if (!activeChatId || !activeKind || activeKind === 'staff') return
    if (!window.confirm('Permanently delete this entire conversation history? This cannot be undone.')) return
    setClearingHistory(true)
    try {
      const url = activeKind === 'partner' ? '/api/admin/partner-messages' : '/api/admin/registrant-messages'
      const res = await fetch(`${url}?chat_id=${activeChatId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to clear history')
      setMessages([])
      await loadContacts()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to clear history')
    } finally {
      setClearingHistory(false)
    }
  }

  function callSelected(type: 'voice' | 'video') {
    if (!selectedContact || !selectedContact.profileId || !activeChatId) return
    const ctx = selectedContact.kind === 'partner' ? partnerCall : selectedContact.kind === 'staff' ? staffCall : memberCall
    ctx?.initiateCall(activeChatId, selectedContact.profileId, selectedContact.name, type)
  }

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading messages...</div>
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-6">Live Chat</h1>
      <p className="text-on-surface-variant/60 text-sm mb-6">One inbox for every contact — members, Partner Network partners, and fellow staff.</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {contacts.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-12 text-center">
              <p className="text-on-surface-variant text-sm">No conversations yet — they appear here as soon as a member or partner visits their dashboard.</p>
            </div>
          ) : (
            contacts.map((c) => {
              const key = contactKey(c.kind, c.profileId, c.chatId)
              return (
                <button
                  key={key}
                  onClick={() => openChat(c)}
                  className={`w-full text-left px-4 py-3 border transition-colors ${
                    selectedKey === key ? 'bg-surface-container-low border-primary' : 'bg-surface-container-low border-outline-variant/10 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-on-surface truncate">{c.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary shrink-0">{c.subLabel}</span>
                  </div>
                  <div className="text-xs text-on-surface-variant/50 mt-1">
                    {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : 'No messages yet'}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="lg:col-span-2">
          {!selectedKey ? (
            <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center h-full flex items-center justify-center">
              <p className="text-on-surface-variant">Select a conversation to view messages.</p>
            </div>
          ) : (
            <div className="bg-surface-container-low border border-outline-variant/10 flex flex-col h-[600px]">
              {selectedContact && (
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-outline-variant/10">
                  <span className="text-sm font-medium text-on-surface truncate">{selectedContact.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedContact.profileId && activeChatId && (
                      <>
                        <button
                          onClick={() => callSelected('voice')}
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                          title="Voice call"
                        >
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>call</span>
                        </button>
                        <button
                          onClick={() => callSelected('video')}
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                          title="Video call"
                        >
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>videocam</span>
                        </button>
                      </>
                    )}
                    {userRole === 'super_admin' && selectedContact.kind !== 'staff' && messages.length > 0 && (
                      <button
                        onClick={clearHistory}
                        disabled={clearingHistory}
                        className="flex items-center gap-1.5 border border-red-500/30 px-3 py-1.5 text-xs disabled:opacity-40 bg-transparent"
                        title="Permanently delete this conversation's history"
                      >
                        <span className="material-symbols-outlined text-red-400" style={{ fontSize: '16px' }}>delete</span>
                        <span className="text-red-400 font-semibold">{clearingHistory ? 'Clearing…' : 'Delete History'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-1 chat-watermark">
                {loadingMessages ? (
                  <p className="text-on-surface-variant text-sm">Loading…</p>
                ) : messages.length === 0 ? (
                  <p className="text-on-surface-variant text-sm">No messages yet — send the first one below.</p>
                ) : (
                  messages.map((m) => {
                    const isOwn = m.sender_id === userId
                    return (
                      <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 ${
                            isOwn
                              ? 'bg-primary/15 border border-primary/20 rounded-2xl rounded-br-sm'
                              : 'bg-surface-container-high border border-outline-variant/10 rounded-2xl rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm text-on-surface whitespace-pre-wrap break-words">{m.content}</p>
                          <div className="text-[11px] text-on-surface-variant/40 mt-1 text-right">{formatTime(m.created_at)}</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="border-t border-outline-variant/10 p-3 flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                  placeholder="Type a reply…"
                  rows={2}
                  className="flex-1 bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="px-4 py-2 bg-primary text-on-primary text-sm disabled:opacity-40 transition-opacity"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
