'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { CallState, CallType, Participant } from '@/lib/hooks/useCall'
import { getSharedAudioContext } from '@/lib/audioUnlock'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function PhoneIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  )
}

function PhoneEndIcon({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function VideoIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" fill={color} />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none" />
    </svg>
  )
}

function VideoOffIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      <line x1="2" y1="2" x2="22" y2="22" strokeWidth={2} />
    </svg>
  )
}

function MicIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  )
}

function MicOffIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      <line x1="3" y1="3" x2="21" y2="21" strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

function AddIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SpeakerIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={color} stroke="none" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  )
}

function SpeakerOffIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={color} stroke="none" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function MinimizeIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// Video element component that handles srcObject via ref
function VideoElement({
  stream,
  muted = false,
  style,
  className,
  onRegister,
  onUnregister,
}: {
  stream: MediaStream | null
  muted?: boolean
  style?: React.CSSProperties
  className?: string
  onRegister?: (el: HTMLMediaElement) => void
  onUnregister?: (el: HTMLMediaElement) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream
    if (stream) {
      // The `autoPlay` attribute alone is unreliable for unmuted remote
      // media — many browsers (mobile Safari especially) silently refuse
      // to start it without an explicit play() call, with no error and no
      // visible symptom besides a stuck avatar / silent audio.
      el.play().catch((err) => {
        console.warn('[CallUI] video/audio play() was blocked:', err)
      })
    }
  }, [stream])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    onRegister?.(el)
    return () => onUnregister?.(el)
  }, [onRegister, onUnregister])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      style={style}
      className={className}
    />
  )
}

// Hidden element carrying a remote participant's audio when no visible video
// tile is playing their stream (voice calls, or a video call where they've
// turned their camera off). Deliberately rendered as a hidden <video> tag
// rather than <audio> — on iOS Safari, an <audio>-only WebRTC session
// defaults output to the earpiece (like a native phone call), while a
// <video> tag reliably defaults to the loudspeaker, which is what people
// expect from a hands-free web call.
function AudioElement({
  stream,
  onRegister,
  onUnregister,
}: {
  stream: MediaStream | null
  onRegister?: (el: HTMLMediaElement) => void
  onUnregister?: (el: HTMLMediaElement) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream
    if (stream) {
      el.play().catch((err) => {
        console.warn('[CallUI] audio play() was blocked:', err)
      })
    }
  }, [stream])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    onRegister?.(el)
    return () => onUnregister?.(el)
  }, [onRegister, onUnregister])

  return <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
}

export interface CallUIProps {
  callState: CallState
  callType: CallType | null
  callDuration: number
  isMuted: boolean
  isVideoOff: boolean
  participants: Participant[]
  localStream: MediaStream | null
  callerName: string | null
  callerType: CallType | null
  onAccept: () => void
  onDecline: () => void
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onAddParticipant?: () => void
  onRejoin?: () => void
  canRejoin?: boolean
  // Floating picture-in-picture mode for a connected call, so the rest of
  // the site is usable while a call is ongoing instead of it blocking
  // everything. Only meaningful while callState === 'connected' — ringing/
  // calling/disconnected always show full-attention UI regardless.
  isMinimized?: boolean
  onMinimize?: () => void
  onRestore?: () => void
}

const STYLES = `
  @keyframes callPulse {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes callRing {
    0% { transform: rotate(-10deg); }
    100% { transform: rotate(10deg); }
  }
  @keyframes callFadeOut {
    0%, 60% { opacity: 1; }
    100% { opacity: 0; }
  }
`

export function CallUI({
  callState,
  callType,
  callDuration,
  isMuted,
  isVideoOff,
  participants,
  localStream,
  callerName,
  callerType,
  onAccept,
  onDecline,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onAddParticipant,
  onRejoin,
  canRejoin,
  isMinimized,
  onMinimize,
  onRestore,
}: CallUIProps) {
  const [endedVisible, setEndedVisible] = useState(false)
  const [endedDuration, setEndedDuration] = useState(0)
  const [endedType, setEndedType] = useState<CallType | null>(null)

  // Loudspeaker toggle. Default on — calls should be hands-free by default,
  // matching how the video-call path already plays audio through a <video>
  // tag (which browsers route to the loudspeaker). Where the browser exposes
  // `setSinkId` (Chrome on Android/desktop; not supported on iOS Safari) we
  // additionally try to route to a device explicitly labeled "speaker" or
  // "earpiece" so the toggle has a real effect there too.
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const isSpeakerOnRef = useRef(isSpeakerOn)
  const mediaElsRef = useRef<Set<HTMLMediaElement>>(new Set())

  useEffect(() => {
    isSpeakerOnRef.current = isSpeakerOn
  }, [isSpeakerOn])

  const applySinkToElement = useCallback(async (el: HTMLMediaElement) => {
    const sinkEl = el as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> }
    if (typeof sinkEl.setSinkId !== 'function') return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const outputs = devices.filter((d) => d.kind === 'audiooutput')
      const speaker = outputs.find((d) => /speaker/i.test(d.label))
      const earpiece = outputs.find((d) => /earpiece|receiver/i.test(d.label))
      const targetId = isSpeakerOnRef.current
        ? speaker?.deviceId || 'default'
        : earpiece?.deviceId || outputs.find((d) => d.deviceId !== speaker?.deviceId)?.deviceId || 'default'
      await sinkEl.setSinkId(targetId)
    } catch (err) {
      console.warn('[CallUI] setSinkId failed:', err)
    }
  }, [])

  const registerMediaEl = useCallback((el: HTMLMediaElement) => {
    mediaElsRef.current.add(el)
    applySinkToElement(el)
  }, [applySinkToElement])

  const unregisterMediaEl = useCallback((el: HTMLMediaElement) => {
    mediaElsRef.current.delete(el)
  }, [])

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      const next = !prev
      isSpeakerOnRef.current = next
      mediaElsRef.current.forEach((el) => applySinkToElement(el))
      return next
    })
  }, [applySinkToElement])

  useEffect(() => {
    if (callState === 'ended') {
      setEndedDuration(callDuration)
      setEndedType(callType)
      setEndedVisible(true)
      const timer = setTimeout(() => setEndedVisible(false), 2000)
      return () => clearTimeout(timer)
    } else {
      setEndedVisible(false)
    }
  }, [callState, callDuration, callType])

  // Ring tone (incoming call) and ringback tone (waiting for the other side
  // to answer) — synthesized so there's no audio file to host or license.
  useEffect(() => {
    if (callState !== 'ringing' && callState !== 'calling') return

    // Reuse the context unlocked on the page's first click/tap (see
    // audioUnlock.ts) rather than a fresh one — a brand-new AudioContext
    // created here has no user gesture of its own to unlock it, especially
    // for an incoming ring, which starts purely from a realtime event.
    const ctx = getSharedAudioContext()
    if (!ctx) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>

    async function playCycle() {
      if (stopped || !ctx) return
      try {
        await ctx.resume()
      } catch (err) {
        console.warn('[CallUI] ring tone AudioContext.resume() was blocked:', err)
      }
      if (stopped) return
      const now = ctx.currentTime
      // Incoming call: classic dual-tone ring (440Hz + 480Hz). Outgoing/waiting:
      // a single softer ringback tone, distinct enough to tell the two apart.
      const freqs = callState === 'ringing' ? [440, 480] : [425]
      const toneDuration = 1.8
      const cycleDuration = callState === 'ringing' ? 3.6 : 5

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05)
      gain.gain.setValueAtTime(0.12, now + toneDuration - 0.1)
      gain.gain.linearRampToValueAtTime(0, now + toneDuration)
      gain.connect(ctx.destination)

      freqs.forEach((f) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = f
        osc.connect(gain)
        osc.start(now)
        osc.stop(now + toneDuration)
      })

      timer = setTimeout(playCycle, cycleDuration * 1000)
    }

    playCycle()

    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [callState])

  if (callState === 'idle' && !endedVisible) return null

  // Disconnected — show rejoin option
  if (callState === 'disconnected') {
    return (
      <>
        <style>{STYLES}</style>
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <PhoneEndIcon size={28} color="#ef4444" />
          </div>
          <p style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '18px',
            color: '#fff',
            marginBottom: '8px',
          }}>Call Disconnected</p>
          <p style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '24px',
          }}>You were disconnected from the call</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {canRejoin && onRejoin && (
              <button
                onClick={onRejoin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 28px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #8a6f2e, #c9a84c)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Raleway', sans-serif",
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#000',
                }}
              >
                <PhoneIcon size={18} color="#000" />
                Rejoin Call
              </button>
            )}
            <button
              onClick={onEndCall}
              style={{
                padding: '12px 24px',
                borderRadius: '24px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '13px',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              Leave
            </button>
          </div>
          <p style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '11px',
            color: 'rgba(255,255,255,0.25)',
            marginTop: '16px',
          }}>Auto-dismissing in 30 seconds</p>
        </div>
      </>
    )
  }

  // Ended flash
  if (callState === 'ended' || (callState === 'idle' && endedVisible)) {
    if (!endedVisible) return null
    const typeLabel = endedType === 'video' ? 'Video call' : 'Call'
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 16px',
          animation: 'callFadeOut 2s ease-out forwards',
        }}
      >
        <style>{STYLES}</style>
        <span
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.05)',
            padding: '4px 12px',
            borderRadius: '12px',
          }}
        >
          {typeLabel} ended {endedDuration > 0 ? `\u2014 ${formatDuration(endedDuration)}` : ''}
        </span>
      </div>
    )
  }

  // Calling overlay
  if (callState === 'calling') {
    const isVideo = callType === 'video'
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          zIndex: 50,
        }}
      >
        <style>{STYLES}</style>

        {/* Local video preview during video calling */}
        {isVideo && localStream && (
          <div style={{ position: 'absolute', bottom: '120px', right: '20px', zIndex: 51 }}>
            <VideoElement
              stream={localStream}
              muted
              style={{
                width: '120px',
                borderRadius: '8px',
                border: '2px solid rgba(201,168,76,0.3)',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Pulsing rings */}
        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(201,168,76,0.3)',
              animation: 'callPulse 2s ease-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(201,168,76,0.2)',
              animation: 'callPulse 2s ease-out infinite 0.5s',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(201,168,76,0.1)',
              animation: 'callPulse 2s ease-out infinite 1s',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(201,168,76,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isVideo ? (
              <VideoIcon size={28} color="#C9A84C" />
            ) : (
              <PhoneIcon size={28} color="#C9A84C" />
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '16px',
              color: '#fff',
              letterSpacing: '1px',
              margin: '0 0 4px 0',
            }}
          >
            Calling...
          </p>
          <p
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              margin: 0,
            }}
          >
            Waiting for answer
          </p>
        </div>

        <button
          onClick={onEndCall}
          style={{
            background: '#ef4444',
            border: 'none',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Cancel call"
        >
          <PhoneEndIcon size={24} color="#fff" />
        </button>
      </div>
    )
  }

  // Ringing overlay (incoming call)
  if (callState === 'ringing') {
    const isVideo = callerType === 'video'
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          zIndex: 50,
        }}
      >
        <style>{STYLES}</style>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(201,168,76,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'callRing 0.5s ease-in-out infinite alternate',
          }}
        >
          {isVideo ? (
            <VideoIcon size={36} color="#C9A84C" />
          ) : (
            <PhoneIcon size={36} color="#C9A84C" />
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '16px',
              color: '#fff',
              letterSpacing: '1px',
              margin: '0 0 4px 0',
            }}
          >
            Incoming {isVideo ? 'video' : 'voice'} call
          </p>
          <p
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '14px',
              color: '#C9A84C',
              margin: 0,
              fontWeight: 600,
            }}
          >
            {callerName}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <button
            onClick={onDecline}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: '50%',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Decline"
          >
            <PhoneEndIcon size={24} color="#fff" />
          </button>

          <button
            onClick={onAccept}
            style={{
              background: '#22c55e',
              border: 'none',
              borderRadius: '50%',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Accept"
          >
            {isVideo ? (
              <VideoIcon size={24} color="#fff" />
            ) : (
              <PhoneIcon size={24} color="#fff" />
            )}
          </button>
        </div>
      </div>
    )
  }

  // Floating picture-in-picture widget -- lets the rest of the site stay
  // usable during a connected call instead of it occupying the whole view.
  if (isMinimized && callState === 'connected') {
    const displayName = participants.map((p) => p.userName).join(', ') || callerName || 'Call'
    const firstParticipant = participants[0]
    const showVideoThumb = callType === 'video' && firstParticipant?.stream && !firstParticipant.isVideoOff

    return (
      <div
        onClick={onRestore}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(8,8,8,0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: '32px',
          padding: '8px 14px 8px 8px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
        title="Tap to return to call"
      >
        {showVideoThumb ? (
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            <VideoElement
              stream={firstParticipant.stream}
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(201,168,76,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: '#C9A84C' }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', fontWeight: 600, color: '#fff', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>
            {formatDuration(callDuration)}
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onEndCall() }}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            background: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          title="End call"
        >
          <PhoneEndIcon size={14} color="#fff" />
        </button>
      </div>
    )
  }

  // Connected -- voice call (compact bar)
  if (callState === 'connected' && callType === 'voice') {
    const participantNames = participants.map((p) => p.userName).join(', ')
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          background: '#080808',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {participants.map((participant) => (
          <AudioElement
            key={participant.userId}
            stream={participant.stream}
            onRegister={registerMediaEl}
            onUnregister={unregisterMediaEl}
          />
        ))}

        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 6px rgba(34,197,94,0.5)',
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {participantNames || callerName || 'Call'}
        </span>

        {participants.length >= 2 && (
          <span
            style={{
              background: 'rgba(201,168,76,0.2)',
              color: '#C9A84C',
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '10px',
              fontFamily: "'Raleway', sans-serif",
              flexShrink: 0,
            }}
          >
            {participants.length + 1}
          </span>
        )}

        <span
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            color: '#fff',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.5px',
            flexShrink: 0,
          }}
        >
          {formatDuration(callDuration)}
        </span>

        <button
          onClick={onToggleMute}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isMuted ? '#ef4444' : '#C9A84C',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <MicOffIcon size={18} color="#ef4444" />
          ) : (
            <MicIcon size={18} color="#C9A84C" />
          )}
        </button>

        <button
          onClick={toggleSpeaker}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isSpeakerOn ? '#C9A84C' : 'rgba(255,255,255,0.4)',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          title={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
        >
          {isSpeakerOn ? (
            <SpeakerIcon size={18} color="#C9A84C" />
          ) : (
            <SpeakerOffIcon size={18} color="rgba(255,255,255,0.4)" />
          )}
        </button>

        <button
          onClick={onToggleVideo}
          style={{
            background: 'none',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#C9A84C',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          title="Switch to video call"
        >
          <VideoIcon size={18} color="#C9A84C" />
        </button>

        {onMinimize && (
          <button
            onClick={onMinimize}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)',
              flexShrink: 0,
            }}
            title="Minimize"
          >
            <MinimizeIcon size={16} color="rgba(255,255,255,0.5)" />
          </button>
        )}

        {onAddParticipant && (
          <button
            onClick={onAddParticipant}
            style={{
              background: 'none',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            title="Add participant"
          >
            <AddIcon size={16} color="#C9A84C" />
          </button>
        )}

        <button
          onClick={onEndCall}
          style={{
            background: '#ef4444',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
          }}
          title="End call"
        >
          <PhoneEndIcon size={14} color="#fff" />
          <span
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            End
          </span>
        </button>
      </div>
    )
  }

  // Connected -- video call (full overlay)
  if (callState === 'connected' && callType === 'video') {
    const count = participants.length
    const gridStyle = getVideoGridStyle(count)

    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Duration timer */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 52,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            padding: '4px 10px',
            borderRadius: '12px',
          }}
        >
          <span
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '14px',
              color: '#fff',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatDuration(callDuration)}
          </span>
        </div>

        {/* Video grid */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            ...gridStyle,
            gap: '0px',
          }}
        >
          {participants.map((participant) => (
            <div
              key={participant.userId}
              style={{
                position: 'relative',
                background: '#111',
                overflow: 'hidden',
              }}
            >
              {/* Audio plays independently of whether the video tile is shown,
                  so turning the camera off doesn't also cut the remote mic. */}
              <AudioElement
                stream={participant.stream}
                onRegister={registerMediaEl}
                onUnregister={unregisterMediaEl}
              />

              {participant.stream && !participant.isVideoOff ? (
                <VideoElement
                  stream={participant.stream}
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#111',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(201,168,76,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: '24px',
                        color: '#C9A84C',
                      }}
                    >
                      {participant.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* Name overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '8px 12px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '12px',
                    color: '#fff',
                    fontWeight: 500,
                  }}
                >
                  {participant.userName}
                </span>
                {participant.isMuted && (
                  <MicOffIcon size={12} color="#ef4444" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Local video PIP */}
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '16px',
            zIndex: 52,
          }}
        >
          {localStream && !isVideoOff ? (
            <VideoElement
              stream={localStream}
              muted
              style={{
                width: '120px',
                borderRadius: '8px',
                border: '2px solid rgba(201,168,76,0.3)',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '120px',
                height: '90px',
                borderRadius: '8px',
                border: '2px solid rgba(201,168,76,0.3)',
                background: '#111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <VideoOffIcon size={20} color="rgba(255,255,255,0.3)" />
            </div>
          )}
        </div>

        {/* Control bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 52,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: '24px',
            padding: '8px 16px',
          }}
        >
          {/* Mute toggle */}
          <button
            onClick={onToggleMute}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: isMuted ? '#ef4444' : 'rgba(201,168,76,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOffIcon size={20} color="#fff" />
            ) : (
              <MicIcon size={20} color="#C9A84C" />
            )}
          </button>

          {/* Video toggle */}
          <button
            onClick={onToggleVideo}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: isVideoOff ? '#ef4444' : 'rgba(201,168,76,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? (
              <VideoOffIcon size={20} color="#fff" />
            ) : (
              <VideoIcon size={20} color="#C9A84C" />
            )}
          </button>

          {/* Speaker toggle */}
          <button
            onClick={toggleSpeaker}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: isSpeakerOn ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
          >
            {isSpeakerOn ? (
              <SpeakerIcon size={20} color="#C9A84C" />
            ) : (
              <SpeakerOffIcon size={20} color="rgba(255,255,255,0.5)" />
            )}
          </button>

          {/* Minimize */}
          {onMinimize && (
            <button
              onClick={onMinimize}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Minimize"
            >
              <MinimizeIcon size={20} color="rgba(255,255,255,0.7)" />
            </button>
          )}

          {/* Add participant */}
          {onAddParticipant && (
            <button
              onClick={onAddParticipant}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '1px solid rgba(201,168,76,0.3)',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Add participant"
            >
              <AddIcon size={20} color="#C9A84C" />
            </button>
          )}

          {/* End call */}
          <button
            onClick={onEndCall}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="End call"
          >
            <PhoneEndIcon size={20} color="#fff" />
          </button>
        </div>
      </div>
    )
  }

  return null
}

function getVideoGridStyle(participantCount: number): React.CSSProperties {
  switch (participantCount) {
    case 0:
      return {}
    case 1:
      return {
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr',
      }
    case 2:
      return {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr',
      }
    case 3:
    case 4:
      return {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }
    case 5:
    default:
      return {
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }
  }
}
