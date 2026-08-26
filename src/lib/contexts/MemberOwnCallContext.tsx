'use client'

// Mirrors PartnerOwnCallContext but for every regular member role's Live
// Chat with Czaah support (elite members, investors, real estate partners,
// workers, employers, OEP partners). Mounting the call hook here in the
// dashboard layout — instead of inside messages/page.tsx — means an
// incoming call rings no matter which /dashboard page the member is on.
//
// Deliberately does NOT expose add-participant here: only super_admin (via
// MemberCallContext on the admin side) can turn a call into a group call.

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

interface MemberOwnCallContextValue {
  call: UseCallReturn
  admin: Admin | null
  chatId: string | null
}

const MemberOwnCallContext = createContext<MemberOwnCallContextValue | null>(null)

export function useMemberOwnCall() {
  return useContext(MemberOwnCallContext)
}

export function MemberOwnCallProvider({
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
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [autoRing, setAutoRing] = useState<{ callerId: string; callerName: string; callType: CallType } | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    primeAudioUnlock()
  }, [])

  useEffect(() => {
    fetch('/api/registrant/messages')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) {
          setChatId(json.chatId || null)
          setAdmin(json.admin || null)
        }
      })
      .catch(() => {})
  }, [])

  const postCallMessage = useCallback(async (content: string) => {
    try {
      await fetch('/api/registrant/messages', {
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
    channelPrefix: 'member-call',
    chatId: activeChatId || chatId || '',
    chatContextType: 'direct',
    chatContextId: chatId || '',
    onCallEnded: handleCallEnded,
    onCallMissed: handleCallMissed,
    externalInvite: autoRing,
  })

  // Once a cross-chat call this member was invited into finishes, hand the
  // call channel back to their own chat.
  useEffect(() => {
    if (call.callState === 'idle') {
      if (activeChatId) setActiveChatId(null)
      if (autoRing) setAutoRing(null)
      if (isMinimized) setIsMinimized(false)
    }
  }, [call.callState, activeChatId, autoRing, isMinimized])

  // Listen for group-call invites from a super_admin currently on a call
  // with a different member — see useCall's inviteExternalUser for the
  // sender side.
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
    <MemberOwnCallContext.Provider value={{ call, admin, chatId }}>
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
            onRejoin={call.rejoinCall}
            canRejoin={call.canRejoin}
            isMinimized={isMinimized}
            onMinimize={() => setIsMinimized(true)}
            onRestore={() => setIsMinimized(false)}
          />
        </div>
      )}
      {children}
    </MemberOwnCallContext.Provider>
  )
}
