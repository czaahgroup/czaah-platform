'use client'
// @ts-nocheck

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCall } from '@/lib/hooks/useCall'
import type { CallType } from '@/lib/hooks/useCall'
import { CallUI } from '@/components/chat/CallUI'
import { primeAudioUnlock } from '@/lib/audioUnlock'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

interface Admin {
  id: string
  full_name: string
}

interface CallLogEntry {
  id: string
  caller_id: string
  receiver_id: string
  call_type: 'voice' | 'video'
  status: 'missed' | 'declined' | 'completed'
  duration_seconds: number
  created_at: string
  caller: { id: string; full_name: string } | null
  receiver: { id: string; full_name: string } | null
}

export default function PartnerMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('Partner')
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  // Normally the call channel is this partner's own chat. When invited into
  // someone else's call (see the group-call-invite listener below), it's
  // temporarily redirected to that chat instead, then reset once the call ends.
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [autoRing, setAutoRing] = useState<{ callerId: string; callerName: string; callType: CallType } | null>(null)
  const [tab, setTab] = useState<'chat' | 'calls'>('chat')
  const [callHistory, setCallHistory] = useState<CallLogEntry[]>([])
  const [callsLoading, setCallsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const loadCallHistory = useCallback(async () => {
    setCallsLoading(true)
    try {
      const res = await fetch('/api/calls/history')
      const json = await res.json()
      if (res.ok) setCallHistory(json.data || [])
    } catch {
      // Best-effort
    } finally {
      setCallsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'calls') loadCallHistory()
  }, [tab, loadCallHistory])

  function formatCallTime(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  function formatCallDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const postCallMessage = useCallback(async (content: string) => {
    try {
      const res = await fetch('/api/partner/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const json = await res.json()
        setMessages((prev) => {
          if (prev.some((m) => m.id === json.data.id)) return prev
          return [...prev, json.data]
        })
      }
    } catch {
      // Best-effort — the call itself already happened
    }
  }, [])

  const handleCallEnded = useCallback(async (durationSeconds: number, type: CallType) => {
    const m = Math.floor(durationSeconds / 60).toString().padStart(2, '0')
    const s = (durationSeconds % 60).toString().padStart(2, '0')
    const label = type === 'video' ? 'Video call' : 'Voice call'
    postCallMessage(`☎ ${label} — ${m}:${s}`)
  }, [postCallMessage])

  const handleCallMissed = useCallback(async (_targetUserId: string, targetName: string, type: CallType) => {
    const label = type === 'video' ? 'video call' : 'voice call'
    postCallMessage(`☎ Missed ${label} to ${targetName}`)
  }, [postCallMessage])

  const call = useCall({
    currentUserId: userId || '',
    currentUserName: userName,
    channelPrefix: 'partner-call',
    chatId: activeChatId || chatId || '',
    chatContextType: 'direct',
    chatContextId: chatId || '',
    onCallEnded: handleCallEnded,
    onCallMissed: handleCallMissed,
    externalInvite: autoRing,
  })

  useEffect(() => {
    primeAudioUnlock()
  }, [])

  // Once a cross-chat call this partner was invited into finishes, hand the
  // call channel back to their own chat.
  useEffect(() => {
    if (call.callState === 'idle' && activeChatId) {
      setActiveChatId(null)
      setAutoRing(null)
    }
  }, [call.callState, activeChatId])

  // Listen for group-call invites from an admin currently on a call with a
  // different partner — see useCall's inviteExternalUser for the sender side.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`partner-invite:${userId}`)
      .on('broadcast', { event: 'group-call-invite' }, ({ payload }) => {
        if (call.callState !== 'idle') return
        setAutoRing({ callerId: payload.callerId, callerName: payload.callerName, callType: payload.callType })
        setActiveChatId(payload.chatId)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    fetch('/api/elite/admins')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setAdmins(json.data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null
      setUserId(uid)
      if (uid) {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', uid).single()
        if (prof?.full_name) setUserName(prof.full_name)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMessages()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Real-time subscription — instant updates when the CZAAH team replies
  useEffect(() => {
    if (!chatId) return

    const channel = supabase
      .channel(`partner-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload: { new: Message }) => {
          const newMessage = payload.new
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
          if (newMessage.sender_id !== userId) {
            fetch('/api/partner/messages').catch(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, userId, supabase])

  async function loadMessages() {
    try {
      const res = await fetch('/api/partner/messages')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load messages')
      setMessages(json.data || [])
      setChatId(json.chatId || null)
      setAdmin(json.admin || null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/partner/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      setMessages((prev) => [...prev, json.data])
      setInput('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center">Loading messages...</div>

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setTab('chat')}
          className={`text-xs px-4 py-2 border-b-2 transition-colors ${tab === 'chat' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/60 hover:text-on-surface-variant'}`}
        >
          Chat
        </button>
        <button
          onClick={() => setTab('calls')}
          className={`text-xs px-4 py-2 border-b-2 transition-colors ${tab === 'calls' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/60 hover:text-on-surface-variant'}`}
        >
          Calls
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="cinzel-text text-2xl text-on-surface">{tab === 'chat' ? 'Live Chat' : 'Call History'}</h1>
          {admin && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: call.onlineUserIds.has(admin.id) ? '#22c55e' : 'rgba(255,255,255,0.2)',
                  boxShadow: call.onlineUserIds.has(admin.id) ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
                }}
              />
              <span className="raleway-text text-xs text-on-surface-variant/60">
                {admin.full_name} &middot; {call.onlineUserIds.has(admin.id) ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
        </div>
        {admin && userId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => call.initiateCall(admin.id, admin.full_name, 'voice')}
              disabled={call.callState !== 'idle'}
              className="flex items-center gap-1.5 border border-primary/30 px-3 py-1.5 text-xs disabled:opacity-40"
              style={{ background: 'none', cursor: call.callState === 'idle' ? 'pointer' : 'default' }}
              title="Start voice call"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#C9A84C">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              <span className="text-primary font-semibold">Call</span>
            </button>
            <button
              onClick={() => call.initiateCall(admin.id, admin.full_name, 'video')}
              disabled={call.callState !== 'idle'}
              className="flex items-center gap-1.5 border border-primary/30 px-3 py-1.5 text-xs disabled:opacity-40"
              style={{ background: 'none', cursor: call.callState === 'idle' ? 'pointer' : 'default' }}
              title="Start video call"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" fill="#C9A84C" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <span className="text-primary font-semibold">Video</span>
            </button>
          </div>
        )}
      </div>
      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6"><p className="text-sm text-red-400">{error}</p></div>}

      <div className="bg-surface-container border border-outline-variant/10 flex flex-col h-[550px]" style={{ position: 'relative' }}>
        {userId && (
          <CallUI
            callState={call.callState}
            callType={call.callType}
            callDuration={call.callDuration}
            isMuted={call.isMuted}
            isVideoOff={call.isVideoOff}
            participants={call.participants}
            localStream={call.localStream}
            callerName={call.callerName}
            callerType={call.callerType}
            onAccept={call.acceptCall}
            onDecline={call.declineCall}
            onEndCall={call.endCall}
            onToggleMute={call.toggleMute}
            onToggleVideo={call.toggleVideo}
            onAddParticipant={() => setShowAddParticipant((v) => !v)}
            onRejoin={call.rejoinCall}
            canRejoin={call.canRejoin}
          />
        )}
        {showAddParticipant && call.callState === 'connected' && (
          <div style={{
            position: 'absolute',
            top: '50px',
            right: '16px',
            zIndex: 60,
            background: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            maxHeight: '200px',
            overflowY: 'auto',
            minWidth: '180px',
          }}>
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              color: 'rgba(201,168,76,0.6)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Add another admin
            </div>
            {admins.filter((a) => a.id !== userId && !call.participants.some((p) => p.userId === a.id)).length === 0 ? (
              <div style={{ padding: '8px 12px', fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                No additional admins available
              </div>
            ) : (
              admins.filter((a) => a.id !== userId && !call.participants.some((p) => p.userId === a.id)).map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    call.addParticipant(a.id, a.full_name)
                    setShowAddParticipant(false)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {a.full_name}
                </button>
              ))
            )}
          </div>
        )}
        {tab === 'chat' ? (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {messages.length === 0 ? (
                <p className="text-on-surface-variant/60 text-sm">No messages yet. Send a message to the CZAAH team below.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="text-sm">
                    <div className="text-xs text-on-surface-variant/40 mb-1">{new Date(m.created_at).toLocaleString()}</div>
                    <div className="bg-surface-container-high text-on-surface-variant px-4 py-3 max-w-[85%] leading-relaxed">{m.content}</div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-outline-variant/10 p-3 flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Type a message to the CZAAH team..."
                rows={2}
                className="flex-1 bg-surface-container-low border border-outline-variant/20 px-3 py-2 text-sm text-on-surface resize-none"
              />
              <button onClick={send} disabled={sending || !input.trim()} className="px-4 py-2 bg-primary text-on-primary text-sm disabled:opacity-40 transition-opacity">
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {callsLoading ? (
              <p className="text-on-surface-variant/60 text-sm p-5">Loading call history...</p>
            ) : callHistory.length === 0 ? (
              <p className="text-on-surface-variant/60 text-sm p-5">No calls yet.</p>
            ) : (
              callHistory.map((entry) => {
                const isCaller = entry.caller_id === userId
                const otherId = isCaller ? entry.receiver_id : entry.caller_id
                const otherName = isCaller ? entry.receiver?.full_name || 'Unknown' : entry.caller?.full_name || 'Unknown'
                const statusColor = entry.status === 'missed' ? '#ef4444' : entry.status === 'declined' ? '#f97316' : '#22c55e'
                const statusLabel = entry.status === 'missed' ? 'Missed' : entry.status === 'declined' ? 'Declined' : 'Completed'
                const canCallBack = admin && otherId === admin.id && call.callState === 'idle'
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/5">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="cinzel-text text-sm text-primary">{otherName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="raleway-text text-[13px] font-semibold text-on-surface">{otherName}</span>
                        <span className="raleway-text text-[11px] text-on-surface-variant/40">{isCaller ? 'Outgoing' : 'Incoming'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
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
                        <span className="raleway-text text-[11px] text-on-surface-variant/40">{entry.call_type === 'video' ? 'Video' : 'Voice'}</span>
                        {entry.status === 'completed' && entry.duration_seconds > 0 && (
                          <span className="raleway-text text-[11px] text-on-surface-variant/40">{formatCallDuration(entry.duration_seconds)}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className="raleway-text text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 shrink-0"
                      style={{ color: statusColor, background: `${statusColor}15` }}
                    >
                      {statusLabel}
                    </span>
                    <span className="raleway-text text-[10px] text-on-surface-variant/40 shrink-0">{formatCallTime(entry.created_at)}</span>
                    {canCallBack && (
                      <button
                        onClick={() => call.initiateCall(otherId, otherName, entry.call_type)}
                        className="flex items-center gap-1 border border-primary/30 px-2 py-1 shrink-0"
                        style={{ background: 'none' }}
                        title="Call back"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#C9A84C">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                        <span className="raleway-text text-[10px] text-primary font-semibold">Call</span>
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
