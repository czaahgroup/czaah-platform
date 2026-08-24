'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'

interface Chat {
  id: string
  last_message_at: string | null
  profiles: { full_name: string; email: string; role: string; company_name: string | null } | null
  registrant_messages: { id: string; is_read: boolean; sender_id: string }[]
}

interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
}

const roleLabels: Record<string, string> = {
  employer: 'Employer',
  oep_partner: 'Employment Promoter',
}

export default function AdminRegistrantMessagesPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadChats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadChats() {
    try {
      const res = await fetch('/api/admin/registrant-messages')
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
      const res = await fetch(`/api/admin/registrant-messages?chat_id=${chatId}`)
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
      const res = await fetch('/api/admin/registrant-messages', {
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
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-6">Registrant Messages</h1>
      <p className="text-on-surface-variant/60 text-sm mb-6">Live chat with Employer and Employment Promoter accounts.</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {chats.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-12 text-center">
              <p className="text-on-surface-variant text-sm">No conversations yet.</p>
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
                  <span className="text-sm font-medium text-on-surface truncate">{c.profiles?.full_name || '—'}</span>
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary shrink-0">{roleLabels[c.profiles?.role || ''] || c.profiles?.role}</span>
                </div>
                {c.profiles?.company_name && (
                  <div className="text-xs text-on-surface-variant/60 mt-0.5 truncate">{c.profiles.company_name}</div>
                )}
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
