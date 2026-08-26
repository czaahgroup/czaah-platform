'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useMeetingRoom } from '@/lib/hooks/useMeetingRoom'
import { MeetingRoomUI } from '@/components/meeting/MeetingRoomUI'

export const runtime = 'edge'

export default function MeetingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
      setUserId(session.user.id)
      setUserName(profile?.full_name || 'Guest')
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const room = useMeetingRoom({
    roomId,
    currentUserId: userId || '',
    currentUserName: userName,
  })

  function handleLeave() {
    room.leave()
    router.push('/')
  }

  if (loading || !userId) {
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
