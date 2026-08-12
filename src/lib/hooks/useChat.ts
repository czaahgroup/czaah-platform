'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
  id: string
  enquiry_id: string
  sender_id: string
  sender_name: string
  sender_role: string
  content: string | null
  message_type: 'text' | 'file' | 'system' | 'internal_note'
  file_url: string | null
  file_name: string | null
  is_read: boolean
  created_at: string
}

interface UseChatOptions {
  enquiryId: string
  currentUserId: string
  userRole: string
}

interface UseChatReturn {
  messages: ChatMessage[]
  sendMessage: (content: string) => Promise<void>
  sendFile: (file: File) => Promise<void>
  sendInternalNote: (content: string) => Promise<void>
  isTyping: string | null
  setTyping: () => void
  loading: boolean
}

export function useChat({ enquiryId, currentUserId, userRole }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState<string | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const broadcastChannelRef = useRef<RealtimeChannel | null>(null)

  // Fetch initial messages
  useEffect(() => {
    let cancelled = false

    async function fetchMessages() {
      setLoading(true)
      try {
        const res = await fetch(`/api/enquiries/${enquiryId}`)
        if (!res.ok) throw new Error('Failed to fetch messages')
        const json = await res.json()
        if (!cancelled) {
          let msgs: ChatMessage[] = json.data?.messages ?? []
          if (userRole === 'member') {
            msgs = msgs.filter((m) => m.message_type !== 'internal_note')
          }
          setMessages(msgs)
        }
      } catch {
        // Silently handle — could add error state if needed
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMessages()
    return () => { cancelled = true }
  }, [enquiryId, userRole])

  // Subscribe to realtime messages
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`chat:${enquiryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `enquiry_id=eq.${enquiryId}`,
        },
        async (payload) => {
          const raw = payload.new as Record<string, unknown>
          if (userRole === 'member' && raw.message_type === 'internal_note') return

          // Fetch full message with sender info from API
          // For messages we sent ourselves, we can fill in immediately
          const newMsg: ChatMessage = {
            id: raw.id as string,
            enquiry_id: raw.enquiry_id as string,
            sender_id: raw.sender_id as string,
            sender_name: raw.sender_id === currentUserId ? 'You' : '',
            sender_role: '',
            content: raw.content as string | null,
            message_type: raw.message_type as ChatMessage['message_type'],
            file_url: raw.file_url as string | null,
            file_name: raw.file_name as string | null,
            is_read: raw.is_read as boolean,
            created_at: raw.created_at as string,
          }

          // If it's from someone else, fetch their name
          if (raw.sender_id !== currentUserId) {
            try {
              const res = await fetch(`/api/enquiries/${enquiryId}`)
              if (res.ok) {
                const json = await res.json()
                const found = (json.data?.messages as ChatMessage[])?.find((m) => m.id === newMsg.id)
                if (found) {
                  newMsg.sender_name = found.sender_name
                  newMsg.sender_role = found.sender_role
                }
              }
            } catch { /* use fallback */ }
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })

          // Auto mark as read if it's from someone else
          if (newMsg.sender_id !== currentUserId && !newMsg.is_read) {
            supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then()
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `enquiry_id=eq.${enquiryId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
          )
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enquiryId, currentUserId, userRole])

  // Typing broadcast channel
  useEffect(() => {
    const supabase = createClient()

    const broadcastChannel = supabase.channel(`typing:${enquiryId}`)

    broadcastChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const senderId = payload.payload?.user_id as string | undefined
        const senderName = payload.payload?.user_name as string | undefined
        if (senderId && senderId !== currentUserId) {
          setIsTyping(senderName ?? 'Someone')
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setIsTyping(null), 3000)
        }
      })
      .subscribe()

    broadcastChannelRef.current = broadcastChannel

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      supabase.removeChannel(broadcastChannel)
    }
  }, [enquiryId, currentUserId])

  // Mark messages as read on mount / when new messages arrive
  useEffect(() => {
    if (messages.length === 0) return
    const supabase = createClient()

    const unreadFromOthers = messages.filter(
      (m) => !m.is_read && m.sender_id !== currentUserId,
    )
    if (unreadFromOthers.length === 0) return

    const ids = unreadFromOthers.map((m) => m.id)
    supabase
      .from('chat_messages')
      .update({ is_read: true })
      .in('id', ids)
      .then(() => {
        setMessages((prev) =>
          prev.map((m) => (ids.includes(m.id) ? { ...m, is_read: true } : m)),
        )
      })
  }, [messages.length, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (content: string) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiry_id: enquiryId,
          content,
          message_type: 'text',
        }),
      })
      if (!res.ok) throw new Error('Failed to send message')
    },
    [enquiryId],
  )

  const sendFile = useCallback(
    async (file: File) => {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiry_id: enquiryId,
          message_type: 'file',
          fileData: base64,
          fileName: file.name,
        }),
      })
      if (!res.ok) throw new Error('Failed to send file')
    },
    [enquiryId],
  )

  const sendInternalNote = useCallback(
    async (content: string) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiry_id: enquiryId,
          content,
          message_type: 'internal_note',
        }),
      })
      if (!res.ok) throw new Error('Failed to send internal note')
    },
    [enquiryId],
  )

  const setTyping = useCallback(() => {
    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId },
    })
  }, [currentUserId])

  return {
    messages,
    sendMessage,
    sendFile,
    sendInternalNote,
    isTyping,
    setTyping,
    loading,
  }
}
