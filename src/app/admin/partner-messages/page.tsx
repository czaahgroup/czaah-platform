'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePartnerCall } from '@/lib/contexts/PartnerCallContext'

interface Chat {
  id: string
  last_message_at: string | null
  partners: { id: string; partner_id: string; profile_id: string; profiles: { full_name: string; email: string } | null } | null
  partner_messages: { id: string; is_read: boolean; sender_id: string }[]
}

interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
}

export default function AdminPartnerMessagesPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()
  const partnerCall = usePartnerCall()

  useEffect(() => {
    loadChats()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedChat = chats.find((c) => c.id === selectedChatId) || null
  const callForChat = selectedChatId ? partnerCall?.getCallState(selectedChatId) : undefined
  const callState = callForChat?.callState || 'idle'

  // Real-time — new message in the open thread
  useEffect(() => {
    if (!selectedChatId) return

    const channel = supabase
      .channel(`admin-partner-messages-${selectedChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_messages',
          filter: `chat_id=eq.${selectedChatId}`,
        },
        (payload: { new: Message }) => {
          const newMessage = payload.new
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
          if (newMessage.sender_id !== userId) {
            fetch(`/api/admin/partner-messages?chat_id=${selectedChatId}`).catch(() => {})
          }
          loadChats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedChatId, userId, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time — any partner chat, to keep the conversation list / unread state live
  useEffect(() => {
    const channel = supabase
      .channel('admin-partner-messages-all')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'partner_messages' },
        () => {
          loadChats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadChats() {
    try {
      const res = await fetch('/api/admin/partner-messages')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load messages')
      setChats(json.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function openChat(chatId: string) {
    setSelectedChatId(chatId)
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/admin/partner-messages?chat_id=${chatId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load thread')
      setMessages(json.data || [])
      await loadChats()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load thread')
    } finally {
      setLoadingMessages(false)
    }
  }

  async function sendReply() {
    if (!reply.trim() || !selectedChatId || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/partner-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChatId, content: reply.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      setMessages((prev) => [...prev, json.data])
      setReply('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading messages...</div>
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-6">Partner Messages</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {chats.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-12 text-center">
              <p className="text-on-surface-variant text-sm">No partner conversations yet.</p>
            </div>
          ) : (
            chats.map((c) => (
              <button
                key={c.id}
                onClick={() => openChat(c.id)}
                className={`w-full text-left px-4 py-3 border transition-colors ${
                  selectedChatId === c.id ? 'bg-surface-container-low border-primary' : 'bg-surface-container-low border-outline-variant/10 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-on-surface truncate">{c.partners?.profiles?.full_name || '—'}</span>
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary shrink-0">{c.partners?.partner_id}</span>
                </div>
                <div className="text-xs text-on-surface-variant/50 mt-1">
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : 'No messages yet'}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {!selectedChatId ? (
            <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center h-full flex items-center justify-center">
              <p className="text-on-surface-variant">Select a conversation to view messages.</p>
            </div>
          ) : (
            <div className="bg-surface-container-low border border-outline-variant/10 flex flex-col h-[600px]">
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-outline-variant/10">
                <span className="text-sm font-medium text-on-surface truncate">
                  {selectedChat?.partners?.profiles?.full_name || 'Partner'}
                </span>
                {selectedChat?.partners?.profile_id && userId && partnerCall && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => partnerCall.initiateCall(
                        selectedChatId!,
                        selectedChat.partners!.profile_id,
                        selectedChat.partners!.profiles?.full_name || 'Partner',
                        'voice'
                      )}
                      disabled={callState !== 'idle'}
                      className="flex items-center gap-1.5 border border-primary/30 px-3 py-1.5 text-xs disabled:opacity-40"
                      style={{ background: 'none', cursor: callState === 'idle' ? 'pointer' : 'default' }}
                      title="Start voice call"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#C9A84C">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                      </svg>
                      <span className="text-primary font-semibold">Call</span>
                    </button>
                    <button
                      onClick={() => partnerCall.initiateCall(
                        selectedChatId!,
                        selectedChat.partners!.profile_id,
                        selectedChat.partners!.profiles?.full_name || 'Partner',
                        'video'
                      )}
                      disabled={callState !== 'idle'}
                      className="flex items-center gap-1.5 border border-primary/30 px-3 py-1.5 text-xs disabled:opacity-40"
                      style={{ background: 'none', cursor: callState === 'idle' ? 'pointer' : 'default' }}
                      title="Start video call"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" fill="#C9A84C" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      <span className="text-primary font-semibold">Video</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                {loadingMessages ? (
                  <p className="text-on-surface-variant text-sm">Loading…</p>
                ) : messages.length === 0 ? (
                  <p className="text-on-surface-variant text-sm">No messages yet — send the first one below.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="text-sm text-on-surface-variant leading-relaxed">
                      <div className="text-xs text-on-surface-variant/40 mb-1">{new Date(m.created_at).toLocaleString()}</div>
                      <div className="bg-surface-container-high px-4 py-3 max-w-[85%]">{m.content}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-outline-variant/10 p-3 flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a reply…"
                  rows={2}
                  className="flex-1 bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="px-4 py-2 bg-primary text-on-primary text-sm disabled:opacity-40 transition-opacity"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
