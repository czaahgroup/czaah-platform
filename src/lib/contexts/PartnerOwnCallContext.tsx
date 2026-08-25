'use client'

// Mirrors PartnerCallContext (the admin-side equivalent) but for the
// partner's own single call relationship. Mounting the call hook here in
// the layout — instead of inside messages/page.tsx — means the call
// survives navigating to any other partner-network page, which is what
// makes minimizing during a call actually useful rather than just ending
// it the moment you leave the chat.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useCall } from '@/lib/hooks/useCall'
import type { CallType, UseCallReturn } from '@/lib/hooks/useCall'
import { CallUI } from '@/components/chat/CallUI'
import { createClient } from '@/lib/supabase/client'
import { primeAudioUnlock } from '@/lib/audioUnlock'

interface Admin {
  id: string
  full_name: string
}

interface PartnerOwnCallContextValue {
  call: UseCallReturn
  admin: Admin | null
  chatId: string | null
  admins: Admin[]
}

const PartnerOwnCallContext = createContext<PartnerOwnCallContextValue | null>(null)

export function usePartnerOwnCall() {
  return useContext(PartnerOwnCallContext)
}

export function PartnerOwnCallProvider({
  userId,
  userName,
  children,
}: {
  userId: string
  userName: string
  children: React.ReactNode
}) {
  const [chatId, setChatId] = useState<string | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [autoRing, setAutoRing] = useState<{ callerId: string; callerName: string; callType: CallType } | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    primeAudioUnlock()
  }, [])

  useEffect(() => {
    fetch('/api/partner/messages')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) {
          setChatId(json.chatId || null)
          setAdmin(json.admin || null)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/elite/admins')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setAdmins(json.data)
      })
      .catch(() => {})
  }, [])

  const postCallMessage = useCallback(async (content: string) => {
    try {
      await fetch('/api/partner/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
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
    currentUserId: userId,
    currentUserName: userName,
    channelPrefix: 'partner-call',
    chatId: activeChatId || chatId || '',
    chatContextType: 'direct',
    chatContextId: chatId || '',
    onCallEnded: handleCallEnded,
    onCallMissed: handleCallMissed,
    externalInvite: autoRing,
  })

  // Once a cross-chat call this partner was invited into finishes, hand the
  // call channel back to their own chat.
  useEffect(() => {
    if (call.callState === 'idle') {
      if (activeChatId) setActiveChatId(null)
      if (autoRing) setAutoRing(null)
      if (isMinimized) setIsMinimized(false)
    }
  }, [call.callState, activeChatId, autoRing, isMinimized])

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

  return (
    <PartnerOwnCallContext.Provider value={{ call, admin, chatId, admins }}>
      {call.callState !== 'idle' && (
        <div style={{ position: 'fixed', inset: isMinimized ? 'auto' : 0, zIndex: 9999 }}>
          <CallUI
            callState={call.callState}
            callType={call.callType}
            callDuration={call.callDuration}
            isMuted={call.isMuted}
            isVideoOff={call.isVideoOff}
            participants={call.participants}
            localStream={call.localStream}
            callerName={call.callerName || admin?.full_name || null}
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
        </div>
      )}
      {children}
    </PartnerOwnCallContext.Provider>
  )
}
