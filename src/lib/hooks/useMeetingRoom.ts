'use client'

// Google-Meet-style open room: unlike useCall (caller/callee ringing tied
// to one chat), a recognized member/staff joins directly. Every pair of
// participants connects automatically via presence — whichever side has
// the lexicographically smaller user id sends the offer, so exactly one
// side initiates per pair and there's no "glare" of both sides offering
// at once.
//
// A guest (requiresApproval) instead "knocks": they subscribe to the
// channel and broadcast a join request, but do NOT acquire media or track
// presence until someone already in the room admits them — mirroring
// Google Meet's "Someone wants to join" gate for people outside the
// organization.

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RoomParticipant {
  userId: string
  userName: string
  stream: MediaStream | null
  isMuted: boolean
  isVideoOff: boolean
}

export interface JoinRequest {
  requesterId: string
  requesterName: string
}

export interface UseMeetingRoomOptions {
  roomId: string
  currentUserId: string
  currentUserName: string
  requiresApproval?: boolean
}

export interface UseMeetingRoomReturn {
  participants: RoomParticipant[]
  localStream: MediaStream | null
  isMuted: boolean
  isVideoOff: boolean
  joined: boolean
  awaitingApproval: boolean
  denied: boolean
  pendingRequests: JoinRequest[]
  admitRequest: (requesterId: string) => void
  denyRequest: (requesterId: string) => void
  toggleMute: () => void
  toggleVideo: () => void
  leave: () => void
}

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export function useMeetingRoom({ roomId, currentUserId, currentUserName, requiresApproval }: UseMeetingRoomOptions): UseMeetingRoomReturn {
  const [participants, setParticipants] = useState<RoomParticipant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [joined, setJoined] = useState(false)
  const [awaitingApproval, setAwaitingApproval] = useState(false)
  const [denied, setDenied] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([])

  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS)
  const namesRef = useRef<Map<string, string>>(new Map())
  const admittedRef = useRef(false)

  // Fetch short-lived TURN credentials — same endpoint the Live Chat calls
  // use, so meetings connect across networks too, not just on the same LAN.
  useEffect(() => {
    let cancelled = false
    fetch('/api/calls/turn-credentials')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.iceServers?.length) iceServersRef.current = data.iceServers
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const createPeerConnection = useCallback((peerId: string, peerName: string, channel: RealtimeChannel) => {
    const existing = peerConnectionsRef.current.get(peerId)
    if (existing) existing.close()
    remoteStreamsRef.current.delete(peerId)

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
    peerConnectionsRef.current.set(peerId, pc)

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { senderId: currentUserId, targetId: peerId, candidate: event.candidate.toJSON() },
        })
      }
    }

    pc.ontrack = (event) => {
      const existingStream = remoteStreamsRef.current.get(peerId)
      const remoteStream = existingStream || new MediaStream()
      if (!existingStream) remoteStreamsRef.current.set(peerId, remoteStream)
      if (!remoteStream.getTracks().some((t) => t.id === event.track.id)) {
        remoteStream.addTrack(event.track)
      }
      setParticipants((prev) => {
        const idx = prev.findIndex((p) => p.userId === peerId)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], stream: remoteStream }
          return updated
        }
        return [...prev, { userId: peerId, userName: peerName, stream: remoteStream, isMuted: false, isVideoOff: false }]
      })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peerConnectionsRef.current.delete(peerId)
        remoteStreamsRef.current.delete(peerId)
        pc.close()
        setParticipants((prev) => prev.filter((p) => p.userId !== peerId))
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!))
    }

    return pc
  }, [currentUserId])

  const flushPendingCandidates = useCallback(async (peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId)
    if (!pc || !pc.remoteDescription) return
    const pending = pendingCandidatesRef.current.get(peerId) || []
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {
        // best-effort
      }
    }
    pendingCandidatesRef.current.delete(peerId)
  }, [])

  const connectToPeer = useCallback(async (peerId: string, peerName: string, channel: RealtimeChannel) => {
    if (peerConnectionsRef.current.has(peerId)) return
    // Deterministic tie-break: only the lexicographically smaller id sends
    // the offer — the other side just waits for it. Avoids both sides
    // racing to offer at once.
    if (currentUserId >= peerId) return

    const pc = createPeerConnection(peerId, peerName, channel)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    channel.send({
      type: 'broadcast',
      event: 'sdp-offer',
      payload: { senderId: currentUserId, senderName: currentUserName, targetId: peerId, sdp: pc.localDescription?.toJSON() },
    })
  }, [currentUserId, currentUserName, createPeerConnection])

  const getLocalMedia = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: { ideal: 24, max: 30 } },
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }, [])

  useEffect(() => {
    if (!roomId || !currentUserId) return
    let cancelled = false

    // Runs once this identity is cleared to actually be in the room —
    // immediately for a recognized member/staff, or after an admit for a
    // waiting guest.
    async function admitSelf(channel: RealtimeChannel) {
      if (admittedRef.current || cancelled) return
      admittedRef.current = true
      try {
        await getLocalMedia()
      } catch (err) {
        console.error('[useMeetingRoom] Failed to get local media:', err)
      }
      if (cancelled) return
      await channel.track({ user_name: currentUserName })
      setAwaitingApproval(false)
      setJoined(true)
    }

    async function setup() {
      const channel = supabase.channel(`meeting-room:${roomId}`, {
        config: { presence: { key: currentUserId } },
      })

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState() as Record<string, { user_name?: string }[]>
          const onlineIds = Object.keys(state)
          onlineIds.forEach((peerId) => {
            if (peerId === currentUserId) return
            const peerName = state[peerId]?.[0]?.user_name || namesRef.current.get(peerId) || 'Participant'
            namesRef.current.set(peerId, peerName)
            connectToPeer(peerId, peerName, channel)
          })
          // Drop anyone who's no longer present.
          setParticipants((prev) => prev.filter((p) => onlineIds.includes(p.userId)))
          peerConnectionsRef.current.forEach((pc, peerId) => {
            if (!onlineIds.includes(peerId)) {
              pc.close()
              peerConnectionsRef.current.delete(peerId)
              remoteStreamsRef.current.delete(peerId)
            }
          })
        })
        .on('broadcast', { event: 'sdp-offer' }, async ({ payload }) => {
          if (payload.senderId === currentUserId || payload.targetId !== currentUserId) return
          try {
            let pc = peerConnectionsRef.current.get(payload.senderId)
            if (!pc) pc = createPeerConnection(payload.senderId, payload.senderName || 'Participant', channel)
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            channel.send({
              type: 'broadcast',
              event: 'sdp-answer',
              payload: { senderId: currentUserId, targetId: payload.senderId, sdp: pc.localDescription?.toJSON() },
            })
            await flushPendingCandidates(payload.senderId)
          } catch (err) {
            console.error('[useMeetingRoom] Error handling offer:', err)
          }
        })
        .on('broadcast', { event: 'sdp-answer' }, async ({ payload }) => {
          if (payload.senderId === currentUserId || payload.targetId !== currentUserId) return
          const pc = peerConnectionsRef.current.get(payload.senderId)
          if (!pc) return
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            await flushPendingCandidates(payload.senderId)
          } catch (err) {
            console.error('[useMeetingRoom] Error handling answer:', err)
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.senderId === currentUserId || payload.targetId !== currentUserId) return
          const pc = peerConnectionsRef.current.get(payload.senderId)
          if (!pc || !pc.remoteDescription) {
            const pending = pendingCandidatesRef.current.get(payload.senderId) || []
            pending.push(payload.candidate)
            pendingCandidatesRef.current.set(payload.senderId, pending)
            return
          }
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
          } catch {
            // best-effort
          }
        })
        .on('broadcast', { event: 'mute-status' }, ({ payload }) => {
          if (payload.senderId === currentUserId) return
          setParticipants((prev) => prev.map((p) => (p.userId === payload.senderId ? { ...p, isMuted: payload.isMuted, isVideoOff: payload.isVideoOff } : p)))
        })
        .on('broadcast', { event: 'join-request' }, ({ payload }) => {
          if (payload.requesterId === currentUserId) return
          // Only someone who's actually in the room can see and act on a
          // knock — a fellow waiting guest doesn't get a say.
          if (!admittedRef.current) return
          setPendingRequests((prev) => (prev.some((r) => r.requesterId === payload.requesterId) ? prev : [...prev, { requesterId: payload.requesterId, requesterName: payload.requesterName || 'Guest' }]))
        })
        .on('broadcast', { event: 'join-approved' }, ({ payload }) => {
          if (payload.targetId !== currentUserId) return
          admitSelf(channel)
        })
        .on('broadcast', { event: 'join-denied' }, ({ payload }) => {
          if (payload.targetId !== currentUserId) return
          setAwaitingApproval(false)
          setDenied(true)
        })
        .subscribe(async (status) => {
          if (status !== 'SUBSCRIBED' || cancelled) return
          if (requiresApproval) {
            setAwaitingApproval(true)
            channel.send({
              type: 'broadcast',
              event: 'join-request',
              payload: { requesterId: currentUserId, requesterName: currentUserName },
            })
          } else {
            await admitSelf(channel)
          }
        })

      channelRef.current = channel
    }

    setup()

    return () => {
      cancelled = true
      admittedRef.current = false
      setJoined(false)
      setAwaitingApproval(false)
      setPendingRequests([])
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
      }
      setLocalStream(null)
      peerConnectionsRef.current.forEach((pc) => pc.close())
      peerConnectionsRef.current.clear()
      remoteStreamsRef.current.clear()
      pendingCandidatesRef.current.clear()
      setParticipants([])
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUserId, requiresApproval])

  const admitRequest = useCallback((requesterId: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'join-approved',
      payload: { targetId: requesterId },
    })
    setPendingRequests((prev) => prev.filter((r) => r.requesterId !== requesterId))
  }, [])

  const denyRequest = useCallback((requesterId: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'join-denied',
      payload: { targetId: requesterId },
    })
    setPendingRequests((prev) => prev.filter((r) => r.requesterId !== requesterId))
  }, [])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const track = stream.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    const muted = !track.enabled
    setIsMuted(muted)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'mute-status',
      payload: { senderId: currentUserId, isMuted: muted, isVideoOff },
    })
  }, [currentUserId, isVideoOff])

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    const videoOff = !track.enabled
    setIsVideoOff(videoOff)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'mute-status',
      payload: { senderId: currentUserId, isMuted, isVideoOff: videoOff },
    })
  }, [currentUserId, isMuted])

  const leave = useCallback(() => {
    admittedRef.current = false
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    setParticipants([])
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setJoined(false)
    setAwaitingApproval(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    participants,
    localStream,
    isMuted,
    isVideoOff,
    joined,
    awaitingApproval,
    denied,
    pendingRequests,
    admitRequest,
    denyRequest,
    toggleMute,
    toggleVideo,
    leave,
  }
}
