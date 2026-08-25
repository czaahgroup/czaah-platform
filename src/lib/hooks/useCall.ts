'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'disconnected'
export type CallType = 'voice' | 'video'

export interface UseCallOptions {
  currentUserId: string
  currentUserName: string
  channelPrefix: string
  chatId: string
  chatContextType?: 'enquiry' | 'direct' | 'admin'
  chatContextId?: string
  onCallEnded?: (durationSeconds: number, type: CallType) => void
  onCallMissed?: (targetUserId: string, targetName: string, type: CallType) => void
}

export interface Participant {
  userId: string
  userName: string
  stream: MediaStream | null
  isMuted: boolean
  isVideoOff: boolean
}

export interface UseCallReturn {
  callState: CallState
  callType: CallType | null
  callDuration: number
  isMuted: boolean
  isVideoOff: boolean
  participants: Participant[]
  callerName: string | null
  callerType: CallType | null
  localStream: MediaStream | null
  initiateCall: (targetUserId: string, targetName: string, type: CallType) => void
  acceptCall: () => void
  declineCall: () => void
  endCall: () => void
  toggleMute: () => void
  toggleVideo: () => void
  addParticipant: (userId: string, userName: string) => void
  rejoinCall: () => void
  canRejoin: boolean
}

// Fallback used only until /api/calls/turn-credentials resolves (or if it
// fails). STUN alone can't relay media, so calls across different networks
// won't connect on this fallback — it exists purely so a call attempt made
// in the first instant after mount doesn't hard-crash with no ICE servers.
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

const CALL_TIMEOUT_MS = 30000

// Helper to log calls to the API
async function logCallToApi(data: {
  callerId: string
  receiverId: string
  callType: string
  status: string
  durationSeconds?: number
  chatContextType?: string
  chatContextId?: string
}) {
  try {
    await fetch('/api/calls/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (err) {
    console.error('Failed to log call:', err)
  }
}

// Notification for missed calls is handled server-side by the /api/calls/log endpoint

export function useCall({
  currentUserId,
  currentUserName,
  channelPrefix,
  chatId,
  chatContextType,
  chatContextId,
  onCallEnded,
  onCallMissed,
}: UseCallOptions): UseCallReturn {
  const [callState, setCallState] = useState<CallState>('idle')
  const [callType, setCallType] = useState<CallType | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callerName, setCallerName] = useState<string | null>(null)
  const [callerType, setCallerType] = useState<CallType | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  // Built up manually from individual `ontrack` events rather than trusting
  // `event.streams[0]` — that "associated stream" is populated inconsistently
  // across browsers (notably Safari/mobile), so one side of a call can end
  // up with a track that never gets attached to anything, showing as a
  // placeholder avatar even though the connection and the track itself are
  // fine.
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStartTimeRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callStateRef = useRef<CallState>('idle')
  const callTypeRef = useRef<CallType | null>(null)
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const isCallerRef = useRef(false)
  const targetUserIdRef = useRef<string | null>(null)
  const participantsRef = useRef<Participant[]>([])
  const [canRejoin, setCanRejoin] = useState(false)
  const lastCallTypeRef = useRef<CallType | null>(null)
  const lastTargetUserIdRef = useRef<string | null>(null)
  const lastTargetNameRef = useRef<string | null>(null)
  const activeCallRef = useRef(false)
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS)

  // Fetch short-lived Cloudflare TURN credentials once on mount, so a real
  // relay path is ready before any call is actually placed or accepted.
  useEffect(() => {
    let cancelled = false
    fetch('/api/calls/turn-credentials')
      .then(async (res) => {
        if (!res.ok) {
          console.warn('[useCall] TURN credentials request failed:', res.status, await res.text().catch(() => ''))
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (data?.iceServers?.length) {
          iceServersRef.current = data.iceServers
          console.info('[useCall] Using TURN-backed ICE servers:', data.iceServers.map((s: RTCIceServer) => s.urls))
        } else {
          console.warn('[useCall] No iceServers in TURN response, staying on STUN-only fallback')
        }
      })
      .catch((err) => {
        console.warn('[useCall] TURN credentials fetch errored, staying on STUN-only fallback:', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Keep refs in sync
  useEffect(() => {
    callStateRef.current = callState
  }, [callState])

  useEffect(() => {
    callTypeRef.current = callType
  }, [callType])

  useEffect(() => {
    participantsRef.current = participants
  }, [participants])

  const supabase = createClient()

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    remoteStreamsRef.current.clear()
    pendingCandidatesRef.current.clear()
    targetUserIdRef.current = null
    isCallerRef.current = false
    setIsMuted(false)
    setIsVideoOff(false)
    setParticipants([])
  }, [])

  // Get local media stream
  const getLocalMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }, [])

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    callStartTimeRef.current = Date.now()
    setCallDuration(0)
    durationTimerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000))
    }, 1000)
  }, [])

  // Create peer connection for a specific participant
  const createPeerConnection = useCallback((participantId: string, participantName: string, channel: RealtimeChannel) => {
    // Close existing connection if any
    const existing = peerConnectionsRef.current.get(participantId)
    if (existing) {
      existing.close()
    }
    // Start this participant's remote stream fresh — a rejoin/reconnect
    // shouldn't carry over tracks from the previous connection attempt.
    remoteStreamsRef.current.delete(participantId)

    console.info('[useCall] Creating peer connection with', iceServersRef.current.length, 'ICE server entries')
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
    peerConnectionsRef.current.set(participantId, pc)

    pc.onicegatheringstatechange = () => {
      console.info('[useCall] ICE gathering state:', pc.iceGatheringState)
    }
    pc.oniceconnectionstatechange = () => {
      console.info('[useCall] ICE connection state:', pc.iceConnectionState)
    }

    // Send ICE candidates via broadcast
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.info('[useCall] Local ICE candidate:', event.candidate.type, event.candidate.protocol)
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            senderId: currentUserId,
            targetId: participantId,
            candidate: event.candidate.toJSON(),
          },
        })
      } else {
        console.info('[useCall] ICE candidate gathering complete')
      }
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.info('[useCall] ontrack fired:', event.track.kind, 'streams:', event.streams.length)
      const existing = remoteStreamsRef.current.get(participantId)
      const remoteStream = existing || new MediaStream()
      if (!existing) remoteStreamsRef.current.set(participantId, remoteStream)
      if (!remoteStream.getTracks().some((t) => t.id === event.track.id)) {
        remoteStream.addTrack(event.track)
      }
      setParticipants((prev) => {
        const idx = prev.findIndex((p) => p.userId === participantId)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], stream: remoteStream }
          return updated
        }
        return [
          ...prev,
          {
            userId: participantId,
            userName: participantName,
            stream: remoteStream,
            isMuted: false,
            isVideoOff: false,
          },
        ]
      })
    }

    pc.onconnectionstatechange = () => {
      console.info('[useCall] Peer connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        // If this is the first connection and we haven't started timer yet
        if (callStateRef.current !== 'connected') {
          setCallState('connected')
          startDurationTimer()
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
        }
        // Add participant if not already in list
        setParticipants((prev) => {
          if (prev.some((p) => p.userId === participantId)) return prev
          return [
            ...prev,
            {
              userId: participantId,
              userName: participantName,
              stream: null,
              isMuted: false,
              isVideoOff: false,
            },
          ]
        })
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        // Remove this participant
        peerConnectionsRef.current.delete(participantId)
        remoteStreamsRef.current.delete(participantId)
        pc.close()
        setParticipants((prev) => prev.filter((p) => p.userId !== participantId))

        // If no more peer connections, show disconnected state with rejoin option
        if (peerConnectionsRef.current.size === 0 && callStateRef.current === 'connected') {
          // Don't fully cleanup — allow rejoin
          if (durationTimerRef.current) {
            clearInterval(durationTimerRef.current)
            durationTimerRef.current = null
          }
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop())
            localStreamRef.current = null
          }
          setLocalStream(null)
          peerConnectionsRef.current.clear()
          pendingCandidatesRef.current.clear()
          setCallState('disconnected')
          setCanRejoin(true)
          // Auto-dismiss after 30 seconds if not rejoined
          setTimeout(() => {
            if (callStateRef.current === 'disconnected') {
              const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000)
              const ct = callTypeRef.current
              setCallState('ended')
              setCanRejoin(false)
              activeCallRef.current = false
              onCallEnded?.(duration, ct || 'voice')
              setTimeout(() => {
                if (callStateRef.current === 'ended') setCallState('idle')
              }, 2000)
            }
          }, 30000)
        }
      }
    }

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!))
    }

    return pc
  }, [currentUserId, cleanup, onCallEnded, startDurationTimer])

  // Flush pending ICE candidates for a specific peer
  const flushPendingCandidates = useCallback(async (participantId: string) => {
    const pc = peerConnectionsRef.current.get(participantId)
    if (!pc || !pc.remoteDescription) return
    const pending = pendingCandidatesRef.current.get(participantId) || []
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.warn('Failed to add ICE candidate:', e)
      }
    }
    pendingCandidatesRef.current.delete(participantId)
  }, [])

  // Initialize channel and listen for signaling events
  useEffect(() => {
    if (!chatId || !currentUserId) return

    const channelName = `${channelPrefix}:${chatId}`
    const channel = supabase.channel(channelName)

    channel
      .on('broadcast', { event: 'call-request' }, async ({ payload }) => {
        if (payload.senderId === currentUserId) return
        if (callStateRef.current !== 'idle') return
        // Incoming call
        setCallerName(payload.senderName)
        setCallerType(payload.callType || 'voice')
        targetUserIdRef.current = payload.senderId
        setCallState('ringing')
      })
      .on('broadcast', { event: 'call-accept' }, async ({ payload }) => {
        if (payload.senderId === currentUserId) return
        if (callStateRef.current !== 'calling') return
        // The receiver accepted -- caller creates the offer
        try {
          const ct = callTypeRef.current || 'voice'
          let stream = localStreamRef.current
          if (!stream) {
            stream = await getLocalMedia(ct)
          }
          const pc = createPeerConnection(payload.senderId, payload.senderName, channel)
          // Tracks already added in createPeerConnection

          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)

          channel.send({
            type: 'broadcast',
            event: 'sdp-offer',
            payload: {
              senderId: currentUserId,
              targetId: payload.senderId,
              sdp: pc.localDescription?.toJSON(),
            },
          })

          await flushPendingCandidates(payload.senderId)
        } catch (e) {
          console.error('Error creating offer:', e)
          cleanup()
          setCallState('idle')
          setCallType(null)
        }
      })
      .on('broadcast', { event: 'sdp-offer' }, async ({ payload }) => {
        if (payload.senderId === currentUserId) return
        if (payload.targetId && payload.targetId !== currentUserId) return

        const pc = peerConnectionsRef.current.get(payload.senderId)
        if (!pc) return

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          channel.send({
            type: 'broadcast',
            event: 'sdp-answer',
            payload: {
              senderId: currentUserId,
              targetId: payload.senderId,
              sdp: pc.localDescription?.toJSON(),
            },
          })

          await flushPendingCandidates(payload.senderId)
        } catch (e) {
          console.error('Error handling offer:', e)
        }
      })
      .on('broadcast', { event: 'sdp-answer' }, async ({ payload }) => {
        if (payload.senderId === currentUserId) return
        if (payload.targetId && payload.targetId !== currentUserId) return

        const pc = peerConnectionsRef.current.get(payload.senderId)
        if (!pc) return

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          await flushPendingCandidates(payload.senderId)
        } catch (e) {
          console.error('Error handling answer:', e)
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.senderId === currentUserId) return
        if (payload.targetId && payload.targetId !== currentUserId) return

        const pc = peerConnectionsRef.current.get(payload.senderId)
        if (!pc) {
          const pending = pendingCandidatesRef.current.get(payload.senderId) || []
          pending.push(payload.candidate)
          pendingCandidatesRef.current.set(payload.senderId, pending)
          return
        }
        if (!pc.remoteDescription) {
          const pending = pendingCandidatesRef.current.get(payload.senderId) || []
          pending.push(payload.candidate)
          pendingCandidatesRef.current.set(payload.senderId, pending)
          return
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        } catch (e) {
          console.warn('Failed to add ICE candidate:', e)
        }
      })
      .on('broadcast', { event: 'call-decline' }, ({ payload }) => {
        if (payload.senderId === currentUserId) return
        if (callStateRef.current === 'calling' || callStateRef.current === 'ringing') {
          // Log declined call if we were the caller
          if (isCallerRef.current && targetUserIdRef.current) {
            logCallToApi({
              callerId: currentUserId,
              receiverId: targetUserIdRef.current,
              callType: callTypeRef.current || 'voice',
              status: 'declined',
              chatContextType,
              chatContextId,
            })
            onCallMissed?.(targetUserIdRef.current, lastTargetNameRef.current || 'Unknown', callTypeRef.current || 'voice')
          }
          setCallState('ended')
          cleanup()
          setCallType(null)
          setCallerType(null)
          setTimeout(() => {
            if (callStateRef.current === 'ended') setCallState('idle')
          }, 2000)
        }
      })
      .on('broadcast', { event: 'call-end' }, ({ payload }) => {
        if (payload.senderId === currentUserId) return

        // If a specific participant left a group call
        if (callStateRef.current === 'connected' && peerConnectionsRef.current.size > 1) {
          const pc = peerConnectionsRef.current.get(payload.senderId)
          if (pc) {
            pc.close()
            peerConnectionsRef.current.delete(payload.senderId)
          }
          remoteStreamsRef.current.delete(payload.senderId)
          setParticipants((prev) => prev.filter((p) => p.userId !== payload.senderId))
          return
        }

        const wasConnected = callStateRef.current === 'connected'
        const duration = wasConnected ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0
        const ct = callTypeRef.current
        setCallState('ended')
        cleanup()
        if (wasConnected) {
          onCallEnded?.(duration, ct || 'voice')
          // Log completed call from receiver's side
          logCallToApi({
            callerId: isCallerRef.current ? currentUserId : payload.senderId,
            receiverId: isCallerRef.current ? payload.senderId : currentUserId,
            callType: ct || 'voice',
            status: 'completed',
            durationSeconds: duration,
            chatContextType,
            chatContextId,
          })
        }
        setCallType(null)
        setCallerType(null)
        setTimeout(() => {
          if (callStateRef.current === 'ended') setCallState('idle')
        }, 2000)
      })
      .on('broadcast', { event: 'add-participant' }, async ({ payload }) => {
        if (payload.senderId === currentUserId) return
        if (payload.targetUserId !== currentUserId) return
        if (callStateRef.current !== 'idle') return

        // Group invite
        setCallerName(payload.senderName)
        setCallerType(payload.callType || 'voice')
        targetUserIdRef.current = payload.senderId
        setCallState('ringing')
      })
      .on('broadcast', { event: 'participant-joined' }, async ({ payload }) => {
        if (payload.senderId === currentUserId) return
        if (callStateRef.current !== 'connected') return

        // New participant joined the call -- create a peer connection with them
        // Only the existing participants who are already connected need to connect
        try {
          const ct = callTypeRef.current || 'voice'
          let stream = localStreamRef.current
          if (!stream) {
            stream = await getLocalMedia(ct)
          }
          const pc = createPeerConnection(payload.senderId, payload.senderName, channel)

          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)

          channel.send({
            type: 'broadcast',
            event: 'sdp-offer',
            payload: {
              senderId: currentUserId,
              targetId: payload.senderId,
              sdp: pc.localDescription?.toJSON(),
            },
          })
        } catch (e) {
          console.error('Error connecting to new participant:', e)
        }
      })
      .on('broadcast', { event: 'participant-left' }, ({ payload }) => {
        if (payload.senderId === currentUserId) return
        const pc = peerConnectionsRef.current.get(payload.senderId)
        if (pc) {
          pc.close()
          peerConnectionsRef.current.delete(payload.senderId)
        }
        remoteStreamsRef.current.delete(payload.senderId)
        setParticipants((prev) => prev.filter((p) => p.userId !== payload.senderId))

        if (peerConnectionsRef.current.size === 0 && callStateRef.current === 'connected') {
          const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000)
          const ct = callTypeRef.current
          setCallState('ended')
          cleanup()
          onCallEnded?.(duration, ct || 'voice')
          setCallType(null)
          setTimeout(() => {
            if (callStateRef.current === 'ended') setCallState('idle')
          }, 2000)
        }
      })
      .on('broadcast', { event: 'call-type-change' }, ({ payload }) => {
        if (payload.senderId === currentUserId) return
        if (payload.callType && payload.callType !== callTypeRef.current) {
          setCallType(payload.callType)
        }
      })
      .on('broadcast', { event: 'mute-status' }, ({ payload }) => {
        if (payload.senderId === currentUserId) return
        setParticipants((prev) =>
          prev.map((p) =>
            p.userId === payload.senderId
              ? { ...p, isMuted: payload.isMuted, isVideoOff: payload.isVideoOff }
              : p
          )
        )
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (callStateRef.current !== 'idle' && callStateRef.current !== 'ended') {
        channel.send({
          type: 'broadcast',
          event: 'call-end',
          payload: { senderId: currentUserId, senderName: currentUserName },
        })
        const wasConnected = callStateRef.current === 'connected'
        const duration = wasConnected ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0
        const ct = callTypeRef.current
        cleanup()
        if (wasConnected) {
          onCallEnded?.(duration, ct || 'voice')
        }
      }
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, currentUserId, channelPrefix, chatContextType, chatContextId])

  const rejoinCall = useCallback(() => {
    if (callStateRef.current !== 'disconnected') return
    if (!lastTargetUserIdRef.current || !lastTargetNameRef.current || !lastCallTypeRef.current) return

    setCanRejoin(false)
    const targetId = lastTargetUserIdRef.current
    const targetName = lastTargetNameRef.current
    const type = lastCallTypeRef.current

    // Reset state for a fresh connection
    peerConnectionsRef.current.clear()
    pendingCandidatesRef.current.clear()
    setCallState('calling')
    setCallType(type)
    targetUserIdRef.current = targetId
    isCallerRef.current = true

    if (type === 'video') {
      getLocalMedia(type).catch((e) => {
        console.error('Failed to get media:', e)
        setCallState('idle')
        setCallType(null)
      })
    }

    const channel = channelRef.current
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'call-request',
        payload: {
          senderId: currentUserId,
          senderName: currentUserName,
          targetUserId: targetId,
          callType: type,
          isRejoin: true,
        },
      })

      timeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'calling') {
          setCallState('idle')
          setCallType(null)
          cleanup()
        }
      }, 30000)
    }
  }, [currentUserId, currentUserName, getLocalMedia, cleanup])

  const initiateCall = useCallback((targetUserId: string, name: string, type: CallType) => {
    if (callStateRef.current !== 'idle') return
    lastTargetUserIdRef.current = targetUserId
    lastTargetNameRef.current = name
    lastCallTypeRef.current = type
    const channel = channelRef.current
    if (!channel) return

    targetUserIdRef.current = targetUserId
    isCallerRef.current = true
    setCallType(type)
    setCallState('calling')

    // Pre-acquire media for video calls so user can see preview
    if (type === 'video') {
      getLocalMedia(type).catch((e) => {
        console.error('Failed to get media:', e)
        setCallState('idle')
        setCallType(null)
      })
    }

    channel.send({
      type: 'broadcast',
      event: 'call-request',
      payload: {
        senderId: currentUserId,
        senderName: currentUserName,
        targetUserId,
        callType: type,
      },
    })

    // Auto-timeout after 30 seconds
    timeoutRef.current = setTimeout(() => {
      if (callStateRef.current === 'calling') {
        channel.send({
          type: 'broadcast',
          event: 'call-end',
          payload: { senderId: currentUserId, senderName: currentUserName },
        })
        // Log missed call (server also creates notification)
        logCallToApi({
          callerId: currentUserId,
          receiverId: targetUserId,
          callType: type,
          status: 'missed',
          chatContextType,
          chatContextId,
        })
        onCallMissed?.(targetUserId, name, type)
        setCallState('ended')
        cleanup()
        setCallType(null)
        setTimeout(() => {
          if (callStateRef.current === 'ended') setCallState('idle')
        }, 2000)
      }
    }, CALL_TIMEOUT_MS)
  }, [currentUserId, currentUserName, cleanup, getLocalMedia, chatContextType, chatContextId, onCallMissed])

  const acceptCall = useCallback(async () => {
    if (callStateRef.current !== 'ringing') return
    const channel = channelRef.current
    if (!channel) return

    const ct = callerType || 'voice'
    setCallType(ct)

    try {
      const stream = await getLocalMedia(ct)
      const senderId = targetUserIdRef.current
      if (!senderId) return

      const pc = createPeerConnection(senderId, callerName || 'Unknown', channel)
      // Tracks already added in createPeerConnection via localStreamRef

      isCallerRef.current = false

      channel.send({
        type: 'broadcast',
        event: 'call-accept',
        payload: {
          senderId: currentUserId,
          senderName: currentUserName,
        },
      })

      setCallState('calling') // Transitioning -- waiting for SDP offer from caller
    } catch (e) {
      console.error('Error accepting call:', e)
      cleanup()
      setCallState('idle')
      setCallType(null)
    }
  }, [currentUserId, currentUserName, callerName, callerType, getLocalMedia, createPeerConnection, cleanup])

  const declineCall = useCallback(() => {
    if (callStateRef.current !== 'ringing') return
    const channel = channelRef.current
    if (!channel) return

    channel.send({
      type: 'broadcast',
      event: 'call-decline',
      payload: { senderId: currentUserId, senderName: currentUserName },
    })

    setCallState('ended')
    cleanup()
    setCallType(null)
    setCallerType(null)
    setTimeout(() => {
      if (callStateRef.current === 'ended') setCallState('idle')
    }, 2000)
  }, [currentUserId, currentUserName, cleanup])

  const endCall = useCallback(() => {
    const channel = channelRef.current
    if (!channel) return

    const wasConnected = callStateRef.current === 'connected'
    const duration = wasConnected ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0
    const ct = callTypeRef.current

    channel.send({
      type: 'broadcast',
      event: 'call-end',
      payload: { senderId: currentUserId, senderName: currentUserName },
    })

    setCallState('ended')
    cleanup()

    if (wasConnected && targetUserIdRef.current) {
      onCallEnded?.(duration, ct || 'voice')
      // Log completed call
      const receiverId = isCallerRef.current ? (lastTargetUserIdRef.current || '') : currentUserId
      const callerId = isCallerRef.current ? currentUserId : (lastTargetUserIdRef.current || '')
      logCallToApi({
        callerId: callerId || currentUserId,
        receiverId: receiverId || currentUserId,
        callType: ct || 'voice',
        status: 'completed',
        durationSeconds: duration,
        chatContextType,
        chatContextId,
      })
    } else if (wasConnected) {
      onCallEnded?.(duration, ct || 'voice')
    }
    setCallType(null)
    setCallerType(null)

    setTimeout(() => {
      if (callStateRef.current === 'ended') setCallState('idle')
    }, 2000)
  }, [currentUserId, currentUserName, cleanup, onCallEnded, chatContextType, chatContextId])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const track = stream.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    const muted = !track.enabled
    setIsMuted(muted)

    // Broadcast mute status
    const channel = channelRef.current
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'mute-status',
        payload: {
          senderId: currentUserId,
          isMuted: muted,
          isVideoOff: isVideoOff,
        },
      })
    }
  }, [currentUserId, isVideoOff])

  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current
    if (!stream) return
    const channel = channelRef.current
    const existingTrack = stream.getVideoTracks()[0]

    // No video track yet — this call started as voice-only. Acquire the
    // camera now, add the track to every active peer connection, and
    // renegotiate so the other side(s) start receiving video without
    // anyone hanging up and re-calling.
    if (!existingTrack) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        const videoTrack = videoStream.getVideoTracks()[0]
        if (!videoTrack) return
        stream.addTrack(videoTrack)

        for (const [participantId, pc] of peerConnectionsRef.current.entries()) {
          pc.addTrack(videoTrack, stream)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          channel?.send({
            type: 'broadcast',
            event: 'sdp-offer',
            payload: {
              senderId: currentUserId,
              targetId: participantId,
              sdp: pc.localDescription?.toJSON(),
            },
          })
        }

        if (callTypeRef.current !== 'video') {
          setCallType('video')
          channel?.send({
            type: 'broadcast',
            event: 'call-type-change',
            payload: { senderId: currentUserId, callType: 'video' },
          })
        }
        setIsVideoOff(false)
      } catch (e) {
        console.error('[useCall] Failed to enable video:', e)
      }
      return
    }

    existingTrack.enabled = !existingTrack.enabled
    const videoOff = !existingTrack.enabled
    setIsVideoOff(videoOff)

    // Broadcast video status
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'mute-status',
        payload: {
          senderId: currentUserId,
          isMuted,
          isVideoOff: videoOff,
        },
      })
    }
  }, [currentUserId, isMuted])

  const addParticipant = useCallback((userId: string, userName: string) => {
    const channel = channelRef.current
    if (!channel) return
    if (callStateRef.current !== 'connected') return

    channel.send({
      type: 'broadcast',
      event: 'add-participant',
      payload: {
        senderId: currentUserId,
        senderName: currentUserName,
        targetUserId: userId,
        targetUserName: userName,
        callType: callTypeRef.current || 'voice',
      },
    })
  }, [currentUserId, currentUserName])

  return {
    callState,
    callType,
    callDuration,
    isMuted,
    isVideoOff,
    participants,
    callerName,
    callerType,
    localStream,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    addParticipant,
    rejoinCall,
    canRejoin,
  }
}
