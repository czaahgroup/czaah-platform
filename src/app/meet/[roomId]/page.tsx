'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useMeetingRoom } from '@/lib/hooks/useMeetingRoom'
import { MeetingRoomUI } from '@/components/meeting/MeetingRoomUI'

export const runtime = 'edge'

function GuestJoinScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('')

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', letterSpacing: '2px', color: '#e6c364', textTransform: 'uppercase', display: 'block', marginBottom: '24px' }}>CZAAH Meeting</span>
        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
          You&apos;re joining as a guest. Enter your name to continue.
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onJoin(name.trim()) }}
          placeholder="Your name"
          autoFocus
          style={{
            width: '100%', padding: '12px 14px', marginBottom: '16px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', fontFamily: "'Raleway', sans-serif", fontSize: '14px', textAlign: 'center',
          }}
        />
        <button
          onClick={() => name.trim() && onJoin(name.trim())}
          disabled={!name.trim()}
          style={{
            width: '100%', padding: '12px', background: 'linear-gradient(135deg, #8a6f2e, #c9a84c)',
            border: 'none', color: '#000', fontFamily: "'Raleway', sans-serif", fontWeight: 600, fontSize: '14px',
            cursor: name.trim() ? 'pointer' : 'default', opacity: name.trim() ? 1 : 0.5,
          }}
        >
          Join Meeting
        </button>
      </div>
    </div>
  )
}

export default function MeetingRoomPage() {
  const params = useParams()
  const roomId = params.roomId as string

  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [needsGuestName, setNeedsGuestName] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
        setUserId(session.user.id)
        setUserName(profile?.full_name || 'Member')
      } else {
        // No account — offer guest join instead of bouncing to /login,
        // same as opening a Google Meet link while signed out.
        setNeedsGuestName(true)
      }
      setCheckingAuth(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function joinAsGuest(name: string) {
    const guestId = `guest-${crypto.randomUUID()}`
    setUserId(guestId)
    setUserName(name)
    setNeedsGuestName(false)
  }

  const room = useMeetingRoom({
    roomId,
    currentUserId: userId || '',
    currentUserName: userName,
  })

  function handleLeave() {
    room.leave()
    window.location.href = '/'
  }

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Loading...</span>
      </div>
    )
  }

  if (needsGuestName) {
    return <GuestJoinScreen onJoin={joinAsGuest} />
  }

  if (!userId) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Joining meeting...</span>
      </div>
    )
  }

  return (
    <MeetingRoomUI
      roomId={roomId}
      localStream={room.localStream}
      participants={room.participants}
      isMuted={room.isMuted}
      isVideoOff={room.isVideoOff}
      joined={room.joined}
      onToggleMute={room.toggleMute}
      onToggleVideo={room.toggleVideo}
      onLeave={handleLeave}
      localName={userName}
    />
  )
}
