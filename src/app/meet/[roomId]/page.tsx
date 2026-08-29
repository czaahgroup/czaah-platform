'use client'
// @ts-nocheck

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useMeetingRoom } from '@/lib/hooks/useMeetingRoom'
import { MeetingRoomUI } from '@/components/meeting/MeetingRoomUI'


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
          Continue
        </button>
      </div>
    </div>
  )
}

/**
 * Google-Meet-style "green room": a camera + mic self-preview with toggles and
 * a "Join now" button, shown before the participant actually enters the room.
 */
function PreJoin({
  roomId,
  userName,
  isGuest,
  onJoin,
}: {
  roomId: string
  userName: string
  isGuest: boolean
  onJoin: (opts: { startMuted: boolean; startVideoOff: boolean }) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [mediaError, setMediaError] = useState(false)

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
      .catch(() => { if (!cancelled) setMediaError(true) })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  function toggleMic() {
    const next = !micOn
    setMicOn(next)
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next })
  }
  function toggleCam() {
    const next = !camOn
    setCamOn(next)
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next })
  }
  function join() {
    // Release the preview so the room's own getUserMedia acquires cleanly.
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    onJoin({ startMuted: !micOn, startVideoOff: !camOn })
  }

  const roundBtn = (active: boolean): React.CSSProperties => ({
    width: '52px', height: '52px', borderRadius: '50%', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'rgba(255,255,255,0.10)' : '#ef4444',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px' }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', letterSpacing: '2px', color: '#e6c364', textTransform: 'uppercase' }}>CZAAH Meeting</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: '20px 18px 48px' }}>
        {/* preview */}
        <div style={{ width: '100%', maxWidth: '560px' }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#111', borderRadius: '14px', overflow: 'hidden' }}>
            {camOn && !mediaError ? (
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '26px', color: '#C9A84C' }}>{(userName || '?').charAt(0).toUpperCase()}</span>
                </div>
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  {mediaError ? 'Camera unavailable' : 'Camera is off'}
                </span>
              </div>
            )}

            <div style={{ position: 'absolute', bottom: '14px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button onClick={toggleMic} title={micOn ? 'Turn off microphone' : 'Turn on microphone'} style={roundBtn(micOn)} disabled={mediaError}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#C9A84C' : '#fff'} strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  {!micOn && <line x1="3" y1="3" x2="21" y2="21" strokeWidth={2} strokeLinecap="round" />}
                </svg>
              </button>
              <button onClick={toggleCam} title={camOn ? 'Turn off camera' : 'Turn on camera'} style={roundBtn(camOn)} disabled={mediaError}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={camOn ? '#C9A84C' : '#fff'} strokeWidth={1.5}>
                  <polygon points="23 7 16 12 23 17 23 7" fill={camOn ? '#C9A84C' : '#fff'} />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  {!camOn && <line x1="2" y1="2" x2="22" y2="22" strokeWidth={2} />}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ready panel */}
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: '#fff', margin: '0 0 8px' }}>Ready to join?</h1>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 6px' }}>
            {isGuest ? 'Someone in the meeting will need to let you in.' : 'No one else is here yet — or they’re waiting for you.'}
          </p>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: '0 0 24px' }}>
            Room code: <span style={{ color: '#C9A84C', letterSpacing: '0.5px' }}>{roomId}</span>
          </p>
          <button
            onClick={join}
            style={{
              width: '100%', padding: '13px 24px', background: 'linear-gradient(135deg, #8a6f2e, #c9a84c)',
              border: 'none', color: '#000', fontFamily: "'Raleway', sans-serif", fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            {isGuest ? 'Ask to join' : 'Join now'}
          </button>
        </div>
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
  const [isGuest, setIsGuest] = useState(false)
  const [readyToJoin, setReadyToJoin] = useState(false)
  const [prefs, setPrefs] = useState<{ startMuted: boolean; startVideoOff: boolean }>({ startMuted: false, startVideoOff: false })

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
    setIsGuest(true)
    setNeedsGuestName(false)
  }

  const room = useMeetingRoom({
    roomId,
    currentUserId: readyToJoin ? (userId || '') : '',
    currentUserName: userName,
    requiresApproval: isGuest,
    startMuted: prefs.startMuted,
    startVideoOff: prefs.startVideoOff,
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

  if (!readyToJoin) {
    return (
      <PreJoin
        roomId={roomId}
        userName={userName}
        isGuest={isGuest}
        onJoin={(opts) => { setPrefs(opts); setReadyToJoin(true) }}
      />
    )
  }

  if (room.denied) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          Your request to join was declined.
        </p>
      </div>
    )
  }

  if (isGuest && !room.joined) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', border: '2px solid rgba(201,168,76,0.3)',
            borderTopColor: '#C9A84C', margin: '0 auto 20px', animation: 'spin 1s linear infinite',
          }} />
          <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: '#fff', marginBottom: '8px' }}>Asking to join...</p>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Someone in the meeting needs to let you in.
          </p>
        </div>
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
      pendingRequests={room.pendingRequests}
      onAdmit={room.admitRequest}
      onDeny={room.denyRequest}
    />
  )
}
