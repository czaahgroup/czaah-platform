'use client'

// Keeps one live `useCall` subscription open per partner conversation, for
// the whole time a super_admin is anywhere in the admin panel — not just
// while they have that specific partner's thread open. That's what makes
// an incoming partner call actually ring the admin regardless of which
// admin page they're on: this provider mounts once in the admin layout,
// so every partner_chats channel stays subscribed in the background.
//
// /admin/registrant-messages (the unified Live Chat) reads/starts partner
// calls through this context instead of running its own useCall for the
// selected chat — running two useCall instances against the same Realtime
// channel at once would let one answer a call while the other is left
// stuck "ringing" forever.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useCall } from '@/lib/hooks/useCall'
import type { CallType, UseCallReturn } from '@/lib/hooks/useCall'
import { CallUI } from '@/components/chat/CallUI'
import { primeAudioUnlock } from '@/lib/audioUnlock'

interface ChatRef {
  id: string
  partnerName: string
  partnerProfileId: string | null
}

interface PartnerCallContextValue {
  initiateCall: (chatId: string, targetUserId: string, targetName: string, type: CallType) => void
  getCallState: (chatId: string) => UseCallReturn | undefined
}

const PartnerCallContext = createContext<PartnerCallContextValue | null>(null)

export function usePartnerCall() {
  return useContext(PartnerCallContext)
}

export function PartnerCallProvider({
  userId,
  userName,
  children,
}: {
  userId: string
  userName: string
  children: React.ReactNode
}) {
  const [chats, setChats] = useState<ChatRef[]>([])
  const [admins, setAdmins] = useState<{ id: string; full_name: string }[]>([])
  const callsRef = useRef<Map<string, UseCallReturn>>(new Map())
  const [, bumpVersion] = useState(0)

  useEffect(() => {
    primeAudioUnlock()
  }, [])

  // Loaded once for the "add another admin to this call" picker.
  useEffect(() => {
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
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadChats() {
      try {
        const res = await fetch('/api/admin/partner-messages')
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return
        setChats(
          (json.data || []).map((c: { id: string; partners: { profile_id: string | null; profiles: { full_name: string } | null } | null }) => ({
            id: c.id,
            partnerName: c.partners?.profiles?.full_name || 'Partner',
            partnerProfileId: c.partners?.profile_id || null,
          }))
        )
      } catch {
        // Best-effort — a failed refresh just means new partners aren't callable until the next one
      }
    }
    loadChats()
    // New partners are a rare, low-frequency event, so a minute-level
    // poll is enough to pick them up without a dedicated realtime feed.
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
    <PartnerCallContext.Provider value={{ initiateCall, getCallState }}>
      {chats.map((c) => (
        <PartnerCallSlot
          key={c.id}
          chatId={c.id}
          partnerName={c.partnerName}
          userId={userId}
          userName={userName}
          admins={admins}
          otherPartners={chats.filter((other) => other.id !== c.id && other.partnerProfileId)}
          onRegister={registerCall}
          onStateChange={() => bumpVersion((n) => n + 1)}
        />
      ))}
      {children}
    </PartnerCallContext.Provider>
  )
}

function PartnerCallSlot({
  chatId,
  partnerName,
  userId,
  userName,
  admins,
  otherPartners,
  onRegister,
  onStateChange,
}: {
  chatId: string
  partnerName: string
  userId: string
  userName: string
  admins: { id: string; full_name: string }[]
  otherPartners: ChatRef[]
  onRegister: (chatId: string, call: UseCallReturn) => void
  onStateChange: () => void
}) {
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const postCallMessage = useCallback(
    async (content: string) => {
      try {
        await fetch('/api/admin/partner-messages', {
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
    channelPrefix: 'partner-call',
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
        callerName={call.callerName || partnerName}
        callerType={call.callerType}
        onAccept={call.acceptCall}
        onDecline={call.declineCall}
        onEndCall={call.endCall}
        onToggleMute={call.toggleMute}
        onToggleVideo={call.toggleVideo}
        onAddParticipant={() => setShowAddParticipant((v) => !v)}
        onRejoin={call.rejoinCall}
        canRejoin={call.canRejoin}
        isMinimized={isMinimized}
        onMinimize={() => setIsMinimized(true)}
        onRestore={() => setIsMinimized(false)}
      />
      {/* Add participant dropdown -- admin can invite another admin into this call */}
      {showAddParticipant && call.callState === 'connected' && !isMinimized && (
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
            Add another partner
          </div>
          {otherPartners.filter((p) => !call.participants.some((cp) => cp.userId === p.partnerProfileId)).length === 0 ? (
            <div style={{
              padding: '8px 12px',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
            }}>
              No other partners available
            </div>
          ) : (
            otherPartners.filter((p) => !call.participants.some((cp) => cp.userId === p.partnerProfileId)).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  call.inviteExternalUser(p.partnerProfileId!, p.partnerName)
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
                {p.partnerName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
