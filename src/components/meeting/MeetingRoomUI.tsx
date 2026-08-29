'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RoomParticipant, JoinRequest } from '@/lib/hooks/useMeetingRoom'

function VideoTile({
  stream,
  name,
  muted,
  isVideoOff,
  isLocal,
}: {
  stream: MediaStream | null
  name: string
  muted?: boolean
  isVideoOff?: boolean
  isLocal?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream
    if (stream) {
      el.play().catch(() => {})
    }
  }, [stream])

  return (
    <div style={{ position: 'relative', background: '#111', overflow: 'hidden', borderRadius: '8px' }}>
      {stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!!isLocal || muted}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isLocal ? 'scaleX(-1)' : undefined }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '20px', color: '#C9A84C' }}>{name.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
        <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#fff' }}>{name}{isLocal ? ' (You)' : ''}</span>
      </div>
    </div>
  )
}

function gridStyle(count: number): React.CSSProperties {
  if (count <= 1) return { gridTemplateColumns: '1fr' }
  if (count === 2) return { gridTemplateColumns: '1fr 1fr' }
  if (count <= 4) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }
  return { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' }
}

export function MeetingRoomUI({
  roomId,
  localStream,
  participants,
  isMuted,
  isVideoOff,
  joined,
  onToggleMute,
  onToggleVideo,
  onLeave,
  localName,
  pendingRequests,
  onAdmit,
  onDeny,
}: {
  roomId: string
  localStream: MediaStream | null
  participants: RoomParticipant[]
  isMuted: boolean
  isVideoOff: boolean
  joined: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onLeave: () => void
  localName: string
  pendingRequests?: JoinRequest[]
  onAdmit?: (requesterId: string) => void
  onDeny?: (requesterId: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const apply = () => setNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const copyLink = useCallback(() => {
    const url = `${window.location.origin}/meet/${roomId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [roomId])

  const tiles = [
    { userId: 'local', userName: localName, stream: localStream, isVideoOff, isLocal: true },
    ...participants.map((p) => ({ userId: p.userId, userName: p.userName, stream: p.stream, isVideoOff: p.isVideoOff, isLocal: false })),
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', padding: '14px 18px' }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', letterSpacing: '2px', color: '#e6c364', textTransform: 'uppercase' }}>CZAAH Meeting</span>
        <button
          onClick={copyLink}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
            background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)',
            color: '#C9A84C', fontFamily: "'Raleway', sans-serif", fontSize: '12px', cursor: 'pointer',
          }}
        >
          {copied ? 'Link Copied' : 'Copy Invite Link'}
        </button>
      </div>

      {pendingRequests && pendingRequests.length > 0 && (
        <div style={{ padding: '0 24px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pendingRequests.map((r) => (
            <div
              key={r.requesterId}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                padding: '10px 16px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)',
              }}
            >
              <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#fff' }}>
                <strong style={{ color: '#C9A84C' }}>{r.requesterName}</strong> wants to join
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onDeny?.(r.requesterId)}
                  style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.7)', fontFamily: "'Raleway', sans-serif", fontSize: '12px', cursor: 'pointer' }}
                >
                  Deny
                </button>
                <button
                  onClick={() => onAdmit?.(r.requesterId)}
                  style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #8a6f2e, #c9a84c)', border: 'none', color: '#000', fontFamily: "'Raleway', sans-serif", fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                >
                  Admit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: 'grid', gap: '10px', padding: narrow ? '0 12px 12px' : '0 24px 16px', ...(narrow ? { gridTemplateColumns: '1fr' } : gridStyle(tiles.length)) }}>
        {tiles.map((t) => (
          <VideoTile key={t.userId} stream={t.stream} name={t.userName} isVideoOff={t.isVideoOff} isLocal={t.isLocal} />
        ))}
      </div>

      {joined && participants.length === 0 && (
        <div style={{ textAlign: 'center', paddingBottom: '12px' }}>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Waiting for others to join — share the invite link above.
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '16px 0 32px' }}>
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          style={{ width: '52px', height: '52px', borderRadius: '50%', border: 'none', background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isMuted ? '#fff' : '#C9A84C'} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            {isMuted && <line x1="3" y1="3" x2="21" y2="21" strokeWidth={2} strokeLinecap="round" />}
          </svg>
        </button>
        <button
          onClick={onToggleVideo}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          style={{ width: '52px', height: '52px', borderRadius: '50%', border: 'none', background: isVideoOff ? '#ef4444' : 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isVideoOff ? '#fff' : '#C9A84C'} strokeWidth={1.5}>
            <polygon points="23 7 16 12 23 17 23 7" fill={isVideoOff ? '#fff' : '#C9A84C'} />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            {isVideoOff && <line x1="2" y1="2" x2="22" y2="22" strokeWidth={2} />}
          </svg>
        </button>
        <button
          onClick={onLeave}
          title="Leave meeting"
          style={{ width: '52px', height: '52px', borderRadius: '50%', border: 'none', background: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>
      </div>
    </div>
  )
}
