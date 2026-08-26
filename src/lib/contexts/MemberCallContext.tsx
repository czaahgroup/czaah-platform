'use client'

// Admin-side counterpart to MemberOwnCallContext — keeps one live `useCall`
// subscription open per member's Live Chat (registrant_chats row), for the
// whole time a staff member is anywhere in the admin panel, the same way
// PartnerCallContext does for Partner Network conversations.
//
// Group-call membership control (adding another participant mid-call) is
// gated behind `canManageGroup`, which the admin layout only sets to true
// for super_admin — a plain admin can join and participate in a call, but
// can't add anyone to it.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useCall } from '@/lib/hooks/useCall'
import type { CallType, UseCallReturn } from '@/lib/hooks/useCall'
import { CallUI } from '@/components/chat/CallUI'
import { primeAudioUnlock } from '@/lib/audioUnlock'

interface ChatRef {
  id: string
  memberName: string
  memberProfileId: string | null
}

interface MemberCallContextValue {
  initiateCall: (chatId: string, targetUserId: string, targetName: string, type: CallType) => void
  getCallState: (chatId: string) => UseCallReturn | undefined
}

const MemberCallContext = createContext<MemberCallContextValue | null>(null)

export function useMemberCall() {
  return useContext(MemberCallContext)
}

export function MemberCallProvider({
  userId,
  userName,
  canManageGroup,
  children,
}: {
  userId: string
  userName: string
  canManageGroup: boolean
  children: React.ReactNode
}) {
  const [chats, setChats] = useState<ChatRef[]>([])
  const [admins, setAdmins] = useState<{ id: string; full_name: string }[]>([])
  const callsRef = useRef<Map<string, UseCallReturn>>(new Map())
  const [, bumpVersion] = useState(0)

  useEffect(() => {
    primeAudioUnlock()
  }, [])

  // Loaded once for the "add another admin to this call" picker — only
  // super_admin gets to add participants, so no need to fetch otherwise.
  useEffect(() => {
    if (!canManageGroup) return
    let cancelled = false
    fetch('/api/elite/admins')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data) setAdmins(json.data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [canManageGroup])

  useEffect(() => {
    let cancelled = false
    async function loadChats() {
      try {
        const res = await fetch('/api/admin/registrant-messages')
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return
        setChats(
          (json.data || []).map((c: { id: string; profile_id: string | null; profiles: { full_name: string } | null }) => ({
            id: c.id,
            memberName: c.profiles?.full_name || 'Member',
            memberProfileId: c.profile_id || null,
          }))
        )
      } catch {
        // Best-effort — a failed refresh just means new members aren't callable until the next one
      }
    }
    loadChats()
    // New members are a rare, low-frequency event, so a minute-level poll
    // is enough to pick them up without a dedicated realtime feed.
    const interval = setInterval(loadChats, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const registerCall = useCallback((chatId: string, call: UseCallReturn) => {
    callsRef.current.set(chatId, call)
  }, [])

  const initiateCall = useCallback((chatId: string, targetUserId: string, targetName: string, type: CallType) => {
    callsRef.current.get(chatId)?.initiateCall(targetUserId, targetName, type)
  }, [])

  const getCallState = useCallback((chatId: string) => callsRef.current.get(chatId), [])

  if (!userId) return <>{children}</>

  return (
    <MemberCallContext.Provider value={{ initiateCall, getCallState }}>
      {chats.map((c) => (
        <MemberCallSlot
          key={c.id}
          chatId={c.id}
          memberName={c.memberName}
          userId={userId}
          userName={userName}
          admins={admins}
          canManageGroup={canManageGroup}
          otherMembers={chats.filter((other) => other.id !== c.id && other.memberProfileId)}
          onRegister={registerCall}
          onStateChange={() => bumpVersion((n) => n + 1)}
        />
      ))}
      {children}
    </MemberCallContext.Provider>
  )
}

function MemberCallSlot({
  chatId,
  memberName,
  userId,
  userName,
  admins,
  canManageGroup,
  otherMembers,
  onRegister,
  onStateChange,
}: {
  chatId: string
  memberName: string
  userId: string
  userName: string
  admins: { id: string; full_name: string }[]
  canManageGroup: boolean
  otherMembers: ChatRef[]
  onRegister: (chatId: string, call: UseCallReturn) => void
  onStateChange: () => void
}) {
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const postCallMessage = useCallback(
    async (content: string) => {
      try {
        await fetch('/api/admin/registrant-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, content }),
        })
      } catch {
        // Best-effort — the call itself already happened
      }
    },
    [chatId]
  )

  const handleCallEnded = useCallback(
    (durationSeconds: number, type: CallType) => {
      const m = Math.floor(durationSeconds / 60).toString().padStart(2, '0')
      const s = (durationSeconds % 60).toString().padStart(2, '0')
      const label = type === 'video' ? 'Video call' : 'Voice call'
      postCallMessage(`☎ ${label} — ${m}:${s}`)
    },
    [postCallMessage]
  )

  const handleCallMissed = useCallback(
    (_targetUserId: string, targetName: string, type: CallType) => {
      const label = type === 'video' ? 'video call' : 'voice call'
      postCallMessage(`☎ Missed ${label} to ${targetName}`)
    },
    [postCallMessage]
  )

  const call = useCall({
    currentUserId: userId,
    currentUserName: userName,
    channelPrefix: 'member-call',
    chatId,
    chatContextType: 'direct',
    chatContextId: chatId,
    onCallEnded: handleCallEnded,
    onCallMissed: handleCallMissed,
  })

  useEffect(() => {
    onRegister(chatId, call)
    onStateChange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.callState])

  // Reset minimize state once the call is fully over, so the next one starts full.
  useEffect(() => {
    if (call.callState === 'idle' && isMinimized) setIsMinimized(false)
  }, [call.callState, isMinimized])

  if (call.callState === 'idle') return null

  return (
    <div style={{ position: 'fixed', inset: isMinimized ? 'auto' : 0, zIndex: 9999 }}>
      <CallUI
        callState={call.callState}
        callType={call.callType}
        callDuration={call.callDuration}
        isMuted={call.isMuted}
        isVideoOff={call.isVideoOff}
        participants={call.participants}
        localStream={call.localStream}
        callerName={call.callerName || memberName}
        callerType={call.callerType}
        onAccept={call.acceptCall}
        onDecline={call.declineCall}
        onEndCall={call.endCall}
        onToggleMute={call.toggleMute}
        onToggleVideo={call.toggleVideo}
        onAddParticipant={canManageGroup ? () => setShowAddParticipant((v) => !v) : undefined}
        onRejoin={call.rejoinCall}
        canRejoin={call.canRejoin}
        isMinimized={isMinimized}
        onMinimize={() => setIsMinimized(true)}
        onRestore={() => setIsMinimized(false)}
      />
      {/* Add participant dropdown -- super_admin only, can invite another admin or member into this call */}
      {canManageGroup && showAddParticipant && call.callState === 'connected' && !isMinimized && (
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
            Add to call
          </div>
          {admins.filter((a) => a.id !== userId && !call.participants.some((p) => p.userId === a.id)).length === 0 ? (
            <div style={{
              padding: '8px 12px',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
            }}>
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
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {a.full_name}
              </button>
            ))
          )}
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '11px',
            color: 'rgba(201,168,76,0.6)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            Add another member
          </div>
          {otherMembers.filter((m) => !call.participants.some((cp) => cp.userId === m.memberProfileId)).length === 0 ? (
            <div style={{
              padding: '8px 12px',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
            }}>
              No other members available
            </div>
          ) : (
            otherMembers.filter((m) => !call.participants.some((cp) => cp.userId === m.memberProfileId)).map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  call.inviteExternalUser(m.memberProfileId!, m.memberName)
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
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {m.memberName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
