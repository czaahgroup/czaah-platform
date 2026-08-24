'use client'

// Keeps one live `useCall` subscription open per partner conversation, for
// the whole time a super_admin is anywhere in the admin panel — not just
// while they have that specific partner's thread open. That's what makes
// an incoming partner call actually ring the admin regardless of which
// admin page they're on: this provider mounts once in the admin layout,
// so every partner_chats channel stays subscribed in the background.
//
// /admin/partner-messages reads/starts calls through this context instead
// of running its own useCall for the selected chat — running two useCall
// instances against the same Realtime channel at once would let one
// answer a call while the other is left stuck "ringing" forever.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useCall } from '@/lib/hooks/useCall'
import type { CallType, UseCallReturn } from '@/lib/hooks/useCall'
import { CallUI } from '@/components/chat/CallUI'
import { primeAudioUnlock } from '@/lib/audioUnlock'

interface ChatRef {
  id: string
  partnerName: string
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
  const callsRef = useRef<Map<string, UseCallReturn>>(new Map())
  const [, bumpVersion] = useState(0)

  useEffect(() => {
    primeAudioUnlock()
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
          (json.data || []).map((c: { id: string; partners: { profiles: { full_name: string } | null } | null }) => ({
            id: c.id,
            partnerName: c.partners?.profiles?.full_name || 'Partner',
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
  onRegister,
  onStateChange,
}: {
  chatId: string
  partnerName: string
  userId: string
  userName: string
  onRegister: (chatId: string, call: UseCallReturn) => void
  onStateChange: () => void
}) {
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

  if (call.callState === 'idle') return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
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
        onRejoin={call.rejoinCall}
        canRejoin={call.canRejoin}
      />
    </div>
  )
}
