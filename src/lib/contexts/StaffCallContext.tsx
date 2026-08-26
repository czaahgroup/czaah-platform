'use client'

// Admin-to-admin counterpart to MemberCallContext/PartnerCallContext —
// keeps one live `useCall` subscription open per staff conversation
// (admin_chats) for the whole time a staff member is anywhere in the
// admin panel, so an incoming call from a colleague rings regardless of
// which admin page they're on. 1:1 only, matching admin_chats' own
// one-to-one shape — no group-call/add-participant here.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useCall } from '@/lib/hooks/useCall'
import type { CallType, UseCallReturn } from '@/lib/hooks/useCall'
import { CallUI } from '@/components/chat/CallUI'
import { primeAudioUnlock } from '@/lib/audioUnlock'

interface ChatRef {
  id: string
  otherUserId: string
  otherUserName: string
}

interface StaffCallContextValue {
  initiateCall: (chatId: string, targetUserId: string, targetName: string, type: CallType) => void
  getCallState: (chatId: string) => UseCallReturn | undefined
}

const StaffCallContext = createContext<StaffCallContextValue | null>(null)

export function useStaffCall() {
  return useContext(StaffCallContext)
}

export function StaffCallProvider({
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
        const res = await fetch('/api/admin/contacts')
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return
        const admins: { id: string; full_name: string }[] = json.data?.admins || []
        const nameMap = new Map(admins.map((a) => [a.id, a.full_name]))
        setChats(
          (json.data?.chats || []).map((c: { id: string; other_user_id: string }) => ({
            id: c.id,
            otherUserId: c.other_user_id,
            otherUserName: nameMap.get(c.other_user_id) || 'Admin',
          }))
        )
      } catch {
        // Best-effort — a failed refresh just means new colleagues aren't callable until the next one
      }
    }
    loadChats()
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
    <StaffCallContext.Provider value={{ initiateCall, getCallState }}>
      {chats.map((c) => (
        <StaffCallSlot
          key={c.id}
          chatId={c.id}
          otherUserName={c.otherUserName}
          userId={userId}
          userName={userName}
          onRegister={registerCall}
          onStateChange={() => bumpVersion((n) => n + 1)}
        />
      ))}
      {children}
    </StaffCallContext.Provider>
  )
}

function StaffCallSlot({
  chatId,
  otherUserName,
  userId,
  userName,
  onRegister,
  onStateChange,
}: {
  chatId: string
  otherUserName: string
  userId: string
  userName: string
  onRegister: (chatId: string, call: UseCallReturn) => void
  onStateChange: () => void
}) {
  const [isMinimized, setIsMinimized] = useState(false)
  const postCallMessage = useCallback(
    async (content: string) => {
      try {
        await fetch(`/api/admin/contacts/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
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

  const call = useCall({
    currentUserId: userId,
    currentUserName: userName,
    channelPrefix: 'staff-call',
    chatId,
    chatContextType: 'direct',
    chatContextId: chatId,
    onCallEnded: handleCallEnded,
  })

  useEffect(() => {
    onRegister(chatId, call)
    onStateChange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.callState])

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
        callerName={call.callerName || otherUserName}
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
  )
}
