'use client'
// @ts-nocheck

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { openFile } from '@/lib/utils/openFile'
import { VoiceNotePlayer, isVoiceNote } from '@/components/chat/VoiceNotePlayer'
import { useStaffCall } from '@/lib/contexts/StaffCallContext'

interface AdminProfile {
  id: string
  full_name: string
  role: string
  avatar_url: string | null
}

interface CallLogEntry {
  id: string
  caller_id: string
  receiver_id: string
  call_type: 'voice' | 'video'
  status: 'missed' | 'declined' | 'completed'
  duration_seconds: number
  created_at: string
  caller: { id: string; full_name: string; role: string } | null
  receiver: { id: string; full_name: string; role: string } | null
}

interface GroupChat {
  id: string
  name: string
  created_by: string
  created_at: string
  last_message_at: string | null
  member_count: number
  last_message: string | null
  last_sender_name: string | null
  unread_count: number
}

interface GroupMessage {
  id: string
  chat_id: string
  sender_id: string
  content: string | null
  file_url: string | null
  file_name: string | null
  is_read_by: string[]
  created_at: string
}

interface GroupMember {
  id: string
  full_name: string
  role: string
  avatar_url: string | null
}

interface Broadcast {
  id: string
  title: string
  content: string
  sent_by: string
  target_roles: string[]
  sent_at: string
  read_count: number
  total_targeted: number
  is_read: boolean
  sender_name: string
}

interface BroadcastDetail {
  broadcast: Broadcast & { sender_name: string }
  read_count: number
  total_targeted: number
  readers: { id: string; full_name: string; role: string; read_at: string }[]
}

type Tab = 'calls' | 'groups' | 'broadcasts'

export default function AdminContactsPage() {
  const [tab, setTab] = useState<Tab>('groups')
  const [callHistory, setCallHistory] = useState<CallLogEntry[]>([])
  const [callsLoading, setCallsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('admin')
  const groupMessagesEndRef = useRef<HTMLDivElement>(null)
  const groupMessagesContainerRef = useRef<HTMLDivElement>(null)
  const groupFileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const staffCall = useStaffCall()

  // Group chat state
  const [groups, setGroups] = useState<GroupChat[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [groupChatLoading, setGroupChatLoading] = useState(false)
  const [groupMessageText, setGroupMessageText] = useState('')
  const [groupSending, setGroupSending] = useState(false)
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [allAdmins, setAllAdmins] = useState<AdminProfile[]>([])
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<{ name: string; created_by: string } | null>(null)

  // Broadcast state
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [broadcastsLoading, setBroadcastsLoading] = useState(false)
  const [showNewBroadcastModal, setShowNewBroadcastModal] = useState(false)
  const [newBroadcastTitle, setNewBroadcastTitle] = useState('')
  const [newBroadcastContent, setNewBroadcastContent] = useState('')
  const [newBroadcastRoles, setNewBroadcastRoles] = useState<string[]>([])
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastDetail | null>(null)
  const [broadcastDetailLoading, setBroadcastDetailLoading] = useState(false)

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null
      setUserId(uid)
      if (uid) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .single()
        if (prof?.role) setUserRole(prof.role)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load call history
  const loadCallHistory = useCallback(async () => {
    setCallsLoading(true)
    try {
      const res = await fetch('/api/calls/history')
      if (res.ok) {
        const json = await res.json()
        setCallHistory(json.data || [])
      }
    } catch (err) {
      console.error('Failed to load call history:', err)
    } finally {
      setCallsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'calls') loadCallHistory()
  }, [tab, loadCallHistory])

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  function getInitial(name: string) {
    return name.charAt(0).toUpperCase()
  }

  // For call history: call back — places the call through the global
  // staff call context (see StaffCallContext) so it rings from anywhere
  // in /admin, not just this page. admin_chats is find-or-create on the
  // server, so this never needs its own local chat list.
  async function handleCallBack(entry: CallLogEntry) {
    const otherId = entry.caller_id === userId ? entry.receiver_id : entry.caller_id
    const otherName = entry.caller_id === userId
      ? entry.receiver?.full_name || 'Unknown'
      : entry.caller?.full_name || 'Unknown'

    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: otherId }),
      })
      if (!res.ok) return
      const json = await res.json()
      staffCall?.initiateCall(json.data.id, otherId, otherName, entry.call_type)
    } catch (err) {
      console.error('Failed to call back:', err)
    }
  }

  // ========== GROUP CHAT FUNCTIONS ==========
  const loadGroups = useCallback(async () => {
    setGroupsLoading(true)
    try {
      const res = await fetch('/api/admin/groups')
      if (res.ok) {
        const json = await res.json()
        setGroups(json.data || [])
      }
    } catch (err) {
      console.error('Failed to load groups:', err)
    } finally {
      setGroupsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'groups') loadGroups()
  }, [tab, loadGroups])

  // Load all admins for group creation
  const loadAllAdmins = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/contacts')
      if (res.ok) {
        const json = await res.json()
        setAllAdmins(json.data.admins || [])
      }
    } catch (err) {
      console.error('Failed to load admins for groups:', err)
    }
  }, [])

  useEffect(() => {
    if (showNewGroupModal || showAddMemberModal) loadAllAdmins()
  }, [showNewGroupModal, showAddMemberModal, loadAllAdmins])

  const loadGroupChat = useCallback(async (groupId: string) => {
    setGroupChatLoading(true)
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`)
      if (res.ok) {
        const json = await res.json()
        setGroupMessages(json.data.messages || [])
        setGroupMembers(json.data.members || [])
        setSelectedGroupInfo(json.data.group ? { name: json.data.group.name, created_by: json.data.group.created_by } : null)
        loadGroups()
      }
    } catch (err) {
      console.error('Failed to load group chat:', err)
    } finally {
      setGroupChatLoading(false)
    }
  }, [loadGroups])

  useEffect(() => {
    if (selectedGroupId) loadGroupChat(selectedGroupId)
  }, [selectedGroupId, loadGroupChat])

  useEffect(() => {
    if (groupMessagesContainerRef.current) { groupMessagesContainerRef.current.scrollTop = groupMessagesContainerRef.current.scrollHeight }
  }, [groupMessages])

  // Real-time subscription for group messages
  useEffect(() => {
    if (!selectedGroupId) return

    const channel = supabase
      .channel(`group-messages-${selectedGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `chat_id=eq.${selectedGroupId}`,
        },
        (payload) => {
          const newMessage = payload.new as GroupMessage
          setGroupMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
          loadGroups()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedGroupId, supabase, loadGroups])

  async function handleCreateGroup() {
    if (!newGroupName.trim() || selectedMemberIds.length === 0 || creatingGroup) return
    setCreatingGroup(true)
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim(), memberIds: selectedMemberIds }),
      })
      if (res.ok) {
        const json = await res.json()
        setShowNewGroupModal(false)
        setNewGroupName('')
        setSelectedMemberIds([])
        await loadGroups()
        setSelectedGroupId(json.data.id)
      }
    } catch (err) {
      console.error('Failed to create group:', err)
    } finally {
      setCreatingGroup(false)
    }
  }

  async function handleSendGroupMessage() {
    if (!groupMessageText.trim() || !selectedGroupId || groupSending) return
    setGroupSending(true)
    try {
      const res = await fetch(`/api/admin/groups/${selectedGroupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: groupMessageText.trim() }),
      })
      if (res.ok) {
        const json = await res.json()
        setGroupMessages((prev) => {
          if (prev.some((m) => m.id === json.data.id)) return prev
          return [...prev, json.data]
        })
        setGroupMessageText('')
      }
    } catch (err) {
      console.error('Failed to send group message:', err)
    } finally {
      setGroupSending(false)
    }
  }

  async function handleGroupFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedGroupId) return

    setGroupSending(true)
    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )
      const res = await fetch(`/api/admin/groups/${selectedGroupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64, fileName: file.name }),
      })
      if (res.ok) {
        const json = await res.json()
        setGroupMessages((prev) => {
          if (prev.some((m) => m.id === json.data.id)) return prev
          return [...prev, json.data]
        })
      }
    } catch (err) {
      console.error('Failed to upload group file:', err)
    } finally {
      setGroupSending(false)
      if (groupFileInputRef.current) groupFileInputRef.current.value = ''
    }
  }

  async function handleAddGroupMember(newUserId: string) {
    if (!selectedGroupId) return
    try {
      const res = await fetch(`/api/admin/groups/${selectedGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newUserId }),
      })
      if (res.ok) {
        setShowAddMemberModal(false)
        loadGroupChat(selectedGroupId)
      }
    } catch (err) {
      console.error('Failed to add member:', err)
    }
  }

  async function handleLeaveGroup() {
    if (!selectedGroupId || !userId) return
    if (!confirm('Are you sure you want to leave this group?')) return
    try {
      const res = await fetch(`/api/admin/groups/${selectedGroupId}/members?userId=${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSelectedGroupId(null)
        setGroupMessages([])
        setGroupMembers([])
        setSelectedGroupInfo(null)
        loadGroups()
      }
    } catch (err) {
      console.error('Failed to leave group:', err)
    }
  }

  function getGroupMemberName(senderId: string): string {
    const member = groupMembers.find((m) => m.id === senderId)
    return member?.full_name || 'Unknown'
  }

  // ========== BROADCAST FUNCTIONS ==========
  const loadBroadcasts = useCallback(async () => {
    setBroadcastsLoading(true)
    try {
      const res = await fetch('/api/admin/broadcasts')
      if (res.ok) {
        const json = await res.json()
        setBroadcasts(json.data || [])
      }
    } catch (err) {
      console.error('Failed to load broadcasts:', err)
    } finally {
      setBroadcastsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'broadcasts') loadBroadcasts()
  }, [tab, loadBroadcasts])

  async function handleSendBroadcast() {
    if (!newBroadcastTitle.trim() || !newBroadcastContent.trim() || newBroadcastRoles.length === 0 || sendingBroadcast) return
    setSendingBroadcast(true)
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBroadcastTitle.trim(),
          content: newBroadcastContent.trim(),
          targetRoles: newBroadcastRoles,
        }),
      })
      if (res.ok) {
        setShowNewBroadcastModal(false)
        setNewBroadcastTitle('')
        setNewBroadcastContent('')
        setNewBroadcastRoles([])
        loadBroadcasts()
      }
    } catch (err) {
      console.error('Failed to send broadcast:', err)
    } finally {
      setSendingBroadcast(false)
    }
  }

  async function handleViewBroadcast(broadcastId: string) {
    setBroadcastDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/broadcasts/${broadcastId}`)
      if (res.ok) {
        const json = await res.json()
        setSelectedBroadcast(json.data)
      }
      // Mark as read
      await fetch(`/api/admin/broadcasts/${broadcastId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      loadBroadcasts()
    } catch (err) {
      console.error('Failed to view broadcast:', err)
    } finally {
      setBroadcastDetailLoading(false)
    }
  }

  function toggleBroadcastRole(role: string) {
    setNewBroadcastRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  function getRoleColor(role: string): string {
    switch (role) {
      case 'member': return 'rgba(156,163,175,0.8)'
      case 'elite_member': return 'rgba(16,185,129,0.8)'
      case 'admin': return 'rgba(59,130,246,0.8)'
      case 'investment_partner': return 'rgba(139,92,246,0.8)'
      default: return 'rgba(255,255,255,0.5)'
    }
  }

  function getRoleBg(role: string): string {
    switch (role) {
      case 'member': return 'rgba(156,163,175,0.1)'
      case 'elite_member': return 'rgba(16,185,129,0.1)'
      case 'admin': return 'rgba(59,130,246,0.1)'
      case 'investment_partner': return 'rgba(139,92,246,0.1)'
      default: return 'rgba(255,255,255,0.05)'
    }
  }

  function getRoleLabel(role: string): string {
    switch (role) {
      case 'member': return 'Members'
      case 'elite_member': return 'Elite Members'
      case 'admin': return 'Admins'
      case 'investment_partner': return 'Partners'
      case 'super_admin': return 'Super Admin'
      default: return role
    }
  }

  return (
    <div>
      <h1 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '24px',
        color: '#fff',
        margin: '0 0 24px 0',
        letterSpacing: '2px',
      }}>
        Team Tools
      </h1>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '16px',
      }}>
        <button
          onClick={() => setTab('calls')}
          style={{
            padding: '10px 24px',
            background: tab === 'calls' ? 'rgba(201,168,76,0.1)' : 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            borderBottom: tab === 'calls' ? '2px solid #C9A84C' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 0,
            cursor: 'pointer',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            fontWeight: tab === 'calls' ? 600 : 400,
            color: tab === 'calls' ? '#C9A84C' : 'rgba(255,255,255,0.5)',
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
          }}
        >
          Calls
        </button>
        <button
          onClick={() => setTab('groups')}
          style={{
            padding: '10px 24px',
            background: tab === 'groups' ? 'rgba(201,168,76,0.1)' : 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            borderBottom: tab === 'groups' ? '2px solid #C9A84C' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 0,
            cursor: 'pointer',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            fontWeight: tab === 'groups' ? 600 : 400,
            color: tab === 'groups' ? '#C9A84C' : 'rgba(255,255,255,0.5)',
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
          }}
        >
          Groups
        </button>
        <button
          onClick={() => setTab('broadcasts')}
          style={{
            padding: '10px 24px',
            background: tab === 'broadcasts' ? 'rgba(201,168,76,0.1)' : 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            borderBottom: tab === 'broadcasts' ? '2px solid #C9A84C' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 0,
            cursor: 'pointer',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            fontWeight: tab === 'broadcasts' ? 600 : 400,
            color: tab === 'broadcasts' ? '#C9A84C' : 'rgba(255,255,255,0.5)',
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
          }}
        >
          Broadcasts
        </button>
      </div>

      {tab === 'groups' ? (
        /* ========== GROUPS TAB ========== */
        <div style={{ display: 'flex', height: 'calc(100vh - 240px)', background: '#080808', borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          {/* Left Panel - Group List */}
          <div style={{ width: '340px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '12px', letterSpacing: '2px', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', margin: 0 }}>
                Groups
              </p>
              <button
                onClick={() => setShowNewGroupModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)',
                  border: 'none',
                  borderRadius: 0,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#000',
                  letterSpacing: '0.5px',
                }}
              >
                + New Group
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {groupsLoading ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
              ) : groups.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>No groups yet</p>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Create a group to start chatting with your team</p>
                </div>
              ) : (
                groups.map((group) => {
                  const isSelected = selectedGroupId === group.id
                  return (
                    <div
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                        background: isSelected ? 'rgba(201,168,76,0.05)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderLeft: isSelected ? '2px solid rgba(201,168,76,0.6)' : '2px solid transparent',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                      {/* Group avatar */}
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#C9A84C">
                          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                        </svg>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', fontWeight: 600, color: '#fff' }}>{group.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {group.unread_count > 0 && (
                              <span style={{ background: '#C9A84C', color: '#000', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: 0, fontFamily: "'Raleway', sans-serif" }}>{group.unread_count}</span>
                            )}
                            <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                              {group.last_message_at ? formatTime(group.last_message_at) : ''}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(201,168,76,0.4)' }}>{group.member_count} members</span>
                        </div>
                        {group.last_message && (
                          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {group.last_sender_name ? `${group.last_sender_name}: ` : ''}{group.last_message}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Panel - Group Chat View */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000', position: 'relative' }}>
            {!selectedGroupId ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>Select a group</p>
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Click on a group to start chatting</p>
              </div>
            ) : (
              <>
                {/* Group Chat Header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#C9A84C">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                    </div>
                    <div>
                      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', color: '#fff', margin: 0, letterSpacing: '1px' }}>
                        {selectedGroupInfo?.name || 'Group'}
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        {groupMembers.slice(0, 5).map((m) => (
                          <div key={m.id} style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'linear-gradient(135deg, #8a6f2e, #c9a84c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontFamily: "'Cinzel', serif", color: '#000', fontWeight: 700 }}>
                            {m.full_name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(201,168,76,0.5)', letterSpacing: '1px', marginLeft: '4px' }}>
                          {groupMembers.length} members
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      style={{ background: 'none', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 0, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: '#C9A84C', fontWeight: 600, transition: 'all 0.2s ease' }}
                    >
                      + Add Member
                    </button>
                    <button
                      onClick={handleLeaveGroup}
                      style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 0, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(239,68,68,0.7)', fontWeight: 600, transition: 'all 0.2s ease' }}
                    >
                      Leave
                    </button>
                  </div>
                </div>

                {/* Group Messages */}
                <div ref={groupMessagesContainerRef} className="chat-watermark" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {groupChatLoading ? (
                    <div style={{ textAlign: 'center', fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)', paddingTop: '40px' }}>Loading messages...</div>
                  ) : groupMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.3)', paddingTop: '40px' }}>No messages yet. Send the first message!</div>
                  ) : (
                    groupMessages.map((msg) => {
                      const isOwn = msg.sender_id === userId
                      const senderName = getGroupMemberName(msg.sender_id)
                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                          <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isOwn ? 'rgba(201,168,76,0.1)' : '#080808', border: isOwn ? '1px solid rgba(201,168,76,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                            {!isOwn && (
                              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: '#C9A84C', margin: '0 0 4px 0', fontWeight: 600 }}>{senderName}</p>
                            )}
                            {msg.content && (
                              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#fff', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.content}</p>
                            )}
                            {msg.file_url && (
                              isVoiceNote(msg.file_name) ? (
                                <div style={{ marginTop: msg.content ? '6px' : 0 }}>
                                  <VoiceNotePlayer fileUrl={msg.file_url} fileName={msg.file_name || 'voice-note.webm'} />
                                </div>
                              ) : (
                                <button
                                  onClick={() => openFile(msg.file_url!)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#C9A84C', textDecoration: 'none', marginTop: msg.content ? '6px' : 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                  <span style={{ fontSize: '14px' }}>&#128206;</span>
                                  {msg.file_name || 'Attachment'}
                                </button>
                              )
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={groupMessagesEndRef} />
                </div>

                {/* Group Message Input */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#080808', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <input ref={groupFileInputRef} type="file" onChange={handleGroupFileAttach} style={{ display: 'none' }} />
                  <button
                    onClick={() => groupFileInputRef.current?.click()}
                    disabled={groupSending}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, padding: '8px 10px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s ease', flexShrink: 0 }}
                    title="Attach file"
                  >
                    &#128206;
                  </button>
                  <input
                    type="text"
                    value={groupMessageText}
                    onChange={(e) => setGroupMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendGroupMessage()
                      }
                    }}
                    placeholder="Type a message..."
                    disabled={groupSending}
                    style={{ flex: 1, background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, padding: '10px 14px', color: '#fff', fontFamily: "'Raleway', sans-serif", fontSize: '13px', outline: 'none', transition: 'border-color 0.2s ease' }}
                  />
                  <button
                    onClick={handleSendGroupMessage}
                    disabled={groupSending || !groupMessageText.trim()}
                    style={{ background: groupMessageText.trim() ? '#C9A84C' : 'rgba(201,168,76,0.2)', border: 'none', borderRadius: 0, padding: '10px 18px', color: groupMessageText.trim() ? '#000' : 'rgba(0,0,0,0.4)', fontFamily: "'Raleway', sans-serif", fontSize: '13px', fontWeight: 600, cursor: groupMessageText.trim() ? 'pointer' : 'default', transition: 'all 0.2s ease', flexShrink: 0 }}
                  >
                    {groupSending ? '...' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* New Group Modal */}
          {showNewGroupModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowNewGroupModal(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: '#080808', borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)', width: '420px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: '#fff', margin: 0, letterSpacing: '1px' }}>Create New Group</h3>
                </div>
                <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
                  <label style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    style={{ width: '100%', background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, padding: '10px 14px', color: '#fff', fontFamily: "'Raleway', sans-serif", fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
                  />
                  <label style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Select Members</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
                    {allAdmins.map((admin) => {
                      const isChecked = selectedMemberIds.includes(admin.id)
                      return (
                        <label key={admin.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: 0, cursor: 'pointer', background: isChecked ? 'rgba(201,168,76,0.05)' : 'transparent', transition: 'background 0.15s ease' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedMemberIds((prev) =>
                                isChecked ? prev.filter((id) => id !== admin.id) : [...prev, admin.id]
                              )
                            }}
                            style={{ accentColor: '#C9A84C' }}
                          />
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #8a6f2e, #c9a84c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontFamily: "'Cinzel', serif", color: '#000', fontWeight: 700 }}>
                            {admin.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#fff', fontWeight: 500 }}>{admin.full_name}</span>
                            <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(201,168,76,0.4)', marginLeft: '8px' }}>{admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    onClick={() => { setShowNewGroupModal(false); setNewGroupName(''); setSelectedMemberIds([]) }}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, padding: '8px 16px', cursor: 'pointer', fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={creatingGroup || !newGroupName.trim() || selectedMemberIds.length === 0}
                    style={{
                      background: newGroupName.trim() && selectedMemberIds.length > 0 ? 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)' : 'rgba(201,168,76,0.2)',
                      border: 'none', borderRadius: 0, padding: '8px 18px', cursor: newGroupName.trim() && selectedMemberIds.length > 0 ? 'pointer' : 'default',
                      fontFamily: "'Raleway', sans-serif", fontSize: '12px', fontWeight: 600, color: '#000',
                    }}
                  >
                    {creatingGroup ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Member Modal */}
          {showAddMemberModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddMemberModal(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: '#080808', borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)', width: '380px', maxHeight: '60vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: '#fff', margin: 0, letterSpacing: '1px' }}>Add Member</h3>
                </div>
                <div style={{ padding: '12px 16px', flex: 1, overflowY: 'auto' }}>
                  {allAdmins
                    .filter((a) => !groupMembers.some((m) => m.id === a.id))
                    .map((admin) => (
                      <div
                        key={admin.id}
                        onClick={() => handleAddGroupMember(admin.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 0, cursor: 'pointer', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #8a6f2e, #c9a84c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontFamily: "'Cinzel', serif", color: '#000', fontWeight: 700 }}>
                          {admin.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#fff' }}>{admin.full_name}</span>
                      </div>
                    ))}
                  {allAdmins.filter((a) => !groupMembers.some((m) => m.id === a.id)).length === 0 && (
                    <p style={{ textAlign: 'center', fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)', padding: '20px 0' }}>All admins are already members</p>
                  )}
                </div>
                <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setShowAddMemberModal(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, padding: '6px 14px', cursor: 'pointer', fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : tab === 'broadcasts' ? (
        /* ========== BROADCASTS TAB ========== */
        <div style={{ display: 'flex', height: 'calc(100vh - 240px)', background: '#080808', borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          {/* Left Panel - Broadcast List */}
          <div style={{ width: '400px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '12px', letterSpacing: '2px', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', margin: 0 }}>
                Broadcasts
              </p>
              {userRole === 'super_admin' && (
                <button
                  onClick={() => setShowNewBroadcastModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)',
                    border: 'none', borderRadius: 0, padding: '5px 12px', cursor: 'pointer',
                    fontFamily: "'Raleway', sans-serif", fontSize: '11px', fontWeight: 600, color: '#000', letterSpacing: '0.5px',
                  }}
                >
                  + New Broadcast
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {broadcastsLoading ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
              ) : broadcasts.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>No broadcasts</p>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                    {userRole === 'super_admin' ? 'Send a broadcast to your team' : 'Broadcasts targeting your role will appear here'}
                  </p>
                </div>
              ) : (
                broadcasts.map((bc) => {
                  const isActive = selectedBroadcast?.broadcast.id === bc.id
                  return (
                    <div
                      key={bc.id}
                      onClick={() => handleViewBroadcast(bc.id)}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderLeft: !bc.is_read ? '3px solid #C9A84C' : '3px solid transparent',
                        background: isActive ? 'rgba(201,168,76,0.05)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', color: '#fff', fontWeight: bc.is_read ? 400 : 600 }}>{bc.title}</span>
                        <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginLeft: '10px' }}>
                          {formatTime(bc.sent_at)}
                        </span>
                      </div>
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bc.content.substring(0, 80)}{bc.content.length > 80 ? '...' : ''}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {bc.target_roles.map((role) => (
                          <span key={role} style={{ fontFamily: "'Raleway', sans-serif", fontSize: '9px', fontWeight: 600, color: getRoleColor(role), background: getRoleBg(role), padding: '2px 8px', borderRadius: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            {getRoleLabel(role)}
                          </span>
                        ))}
                        {userRole === 'super_admin' && (
                          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                            {bc.read_count}/{bc.total_targeted} read
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Panel - Broadcast Detail */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000', overflowY: 'auto' }}>
            {!selectedBroadcast ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>Select a broadcast</p>
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Click on a broadcast to view details</p>
              </div>
            ) : broadcastDetailLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Loading...</span>
              </div>
            ) : (
              <div style={{ padding: '30px' }}>
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '20px', color: '#fff', margin: '0 0 8px 0', letterSpacing: '1px' }}>
                  {selectedBroadcast.broadcast.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    Sent by {selectedBroadcast.broadcast.sender_name}
                  </span>
                  <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                    {new Date(selectedBroadcast.broadcast.sent_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {selectedBroadcast.broadcast.target_roles.map((role) => (
                    <span key={role} style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', fontWeight: 600, color: getRoleColor(role), background: getRoleBg(role), padding: '3px 10px', borderRadius: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {getRoleLabel(role)}
                    </span>
                  ))}
                </div>
                <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 0, padding: '20px', marginBottom: '24px' }}>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {selectedBroadcast.broadcast.content}
                  </p>
                </div>

                {/* Read receipts (super_admin only) */}
                {userRole === 'super_admin' && (
                  <div>
                    <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px 0', letterSpacing: '1px' }}>
                      Read Receipts ({selectedBroadcast.read_count}/{selectedBroadcast.total_targeted})
                    </h3>
                    {selectedBroadcast.readers.length === 0 ? (
                      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No one has read this broadcast yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedBroadcast.readers.map((reader) => (
                          <div key={reader.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#080808', borderRadius: 0, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #8a6f2e, #c9a84c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontFamily: "'Cinzel', serif", color: '#000', fontWeight: 700 }}>
                              {reader.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#fff', flex: 1 }}>{reader.full_name}</span>
                            <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                              {new Date(reader.read_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New Broadcast Modal */}
          {showNewBroadcastModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowNewBroadcastModal(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: '#080808', borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)', width: '480px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: '#fff', margin: 0, letterSpacing: '1px' }}>New Broadcast</h3>
                </div>
                <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
                  <label style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Title</label>
                  <input
                    type="text"
                    value={newBroadcastTitle}
                    onChange={(e) => setNewBroadcastTitle(e.target.value)}
                    placeholder="Broadcast title..."
                    style={{ width: '100%', background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, padding: '10px 14px', color: '#fff', fontFamily: "'Raleway', sans-serif", fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
                  />
                  <label style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Content</label>
                  <textarea
                    value={newBroadcastContent}
                    onChange={(e) => setNewBroadcastContent(e.target.value)}
                    placeholder="Type your broadcast message..."
                    rows={6}
                    style={{ width: '100%', background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, padding: '10px 14px', color: '#fff', fontFamily: "'Raleway', sans-serif", fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', resize: 'vertical' }}
                  />
                  <label style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Target Audience</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    {[
                      { value: 'member', label: 'Members' },
                      { value: 'elite_member', label: 'Elite Members' },
                      { value: 'admin', label: 'Admins' },
                      { value: 'investment_partner', label: 'Partners' },
                    ].map(({ value, label }) => {
                      const isActive = newBroadcastRoles.includes(value)
                      return (
                        <button
                          key={value}
                          onClick={() => toggleBroadcastRole(value)}
                          style={{
                            background: isActive ? getRoleBg(value) : 'transparent',
                            border: `1px solid ${isActive ? getRoleColor(value) : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: 0, padding: '6px 14px', cursor: 'pointer',
                            fontFamily: "'Raleway', sans-serif", fontSize: '12px',
                            color: isActive ? getRoleColor(value) : 'rgba(255,255,255,0.4)',
                            fontWeight: isActive ? 600 : 400, transition: 'all 0.2s ease',
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => {
                        const allRoles = ['member', 'elite_member', 'admin', 'investment_partner']
                        const allSelected = allRoles.every((r) => newBroadcastRoles.includes(r))
                        setNewBroadcastRoles(allSelected ? [] : allRoles)
                      }}
                      style={{
                        background: newBroadcastRoles.length === 4 ? 'rgba(201,168,76,0.1)' : 'transparent',
                        border: `1px solid ${newBroadcastRoles.length === 4 ? '#C9A84C' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 0, padding: '6px 14px', cursor: 'pointer',
                        fontFamily: "'Raleway', sans-serif", fontSize: '12px',
                        color: newBroadcastRoles.length === 4 ? '#C9A84C' : 'rgba(255,255,255,0.4)',
                        fontWeight: newBroadcastRoles.length === 4 ? 600 : 400, transition: 'all 0.2s ease',
                      }}
                    >
                      All
                    </button>
                  </div>
                </div>
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    onClick={() => { setShowNewBroadcastModal(false); setNewBroadcastTitle(''); setNewBroadcastContent(''); setNewBroadcastRoles([]) }}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, padding: '8px 16px', cursor: 'pointer', fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendBroadcast}
                    disabled={sendingBroadcast || !newBroadcastTitle.trim() || !newBroadcastContent.trim() || newBroadcastRoles.length === 0}
                    style={{
                      background: newBroadcastTitle.trim() && newBroadcastContent.trim() && newBroadcastRoles.length > 0 ? 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)' : 'rgba(201,168,76,0.2)',
                      border: 'none', borderRadius: 0, padding: '8px 18px',
                      cursor: newBroadcastTitle.trim() && newBroadcastContent.trim() && newBroadcastRoles.length > 0 ? 'pointer' : 'default',
                      fontFamily: "'Raleway', sans-serif", fontSize: '12px', fontWeight: 600, color: '#000',
                    }}
                  >
                    {sendingBroadcast ? 'Sending...' : 'Send Broadcast'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========== CALLS TAB ========== */
        <div style={{
          background: '#080808',
          borderRadius: 0,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 240px)',
          overflowY: 'auto',
        }}>
          {callsLoading ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
              color: 'rgba(255,255,255,0.4)',
            }}>
              Loading call history...
            </div>
          ) : callHistory.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
            }}>
              <p style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '14px',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '8px',
              }}>
                No call history
              </p>
              <p style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '12px',
                color: 'rgba(255,255,255,0.3)',
              }}>
                Call history will appear here
              </p>
            </div>
          ) : (
            callHistory.map((entry) => {
              const isCaller = entry.caller_id === userId
              const otherName = isCaller
                ? entry.receiver?.full_name || 'Unknown'
                : entry.caller?.full_name || 'Unknown'
              const statusColor = entry.status === 'missed' ? '#ef4444'
                : entry.status === 'declined' ? '#f97316'
                : '#22c55e'
              const statusLabel = entry.status === 'missed' ? 'Missed'
                : entry.status === 'declined' ? 'Declined'
                : 'Completed'

              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: entry.status !== 'completed' ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                  }}
                  onClick={() => {
                    if (entry.status !== 'completed') handleCallBack(entry)
                  }}
                  onMouseEnter={(e) => {
                    if (entry.status !== 'completed') e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(201,168,76,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '16px',
                      color: '#C9A84C',
                    }}>
                      {getInitial(otherName)}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#fff',
                      }}>
                        {otherName}
                      </span>
                      {/* Direction arrow */}
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '11px',
                        color: isCaller ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.3)',
                      }}>
                        {isCaller ? 'Outgoing' : 'Incoming'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      {/* Call type icon */}
                      {entry.call_type === 'video' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="23 7 16 12 23 17 23 7" fill="rgba(255,255,255,0.4)" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                      )}
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.3)',
                      }}>
                        {entry.call_type === 'video' ? 'Video' : 'Voice'}
                      </span>
                      {entry.status === 'completed' && entry.duration_seconds > 0 && (
                        <span style={{
                          fontFamily: "'Raleway', sans-serif",
                          fontSize: '11px',
                          color: 'rgba(255,255,255,0.3)',
                        }}>
                          {formatDuration(entry.duration_seconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '10px',
                    fontWeight: 700,
                    color: statusColor,
                    background: `${statusColor}15`,
                    padding: '3px 10px',
                    borderRadius: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    flexShrink: 0,
                  }}>
                    {statusLabel}
                  </span>

                  {/* Timestamp */}
                  <span style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.3)',
                    flexShrink: 0,
                  }}>
                    {formatTime(entry.created_at)}
                  </span>

                  {/* Call back button for missed/declined */}
                  {entry.status !== 'completed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCallBack(entry)
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(201,168,76,0.3)',
                        borderRadius: 0,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                      }}
                      title="Call back"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#C9A84C">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                      </svg>
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '10px',
                        color: '#C9A84C',
                        fontWeight: 600,
                      }}>
                        Call Back
                      </span>
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
