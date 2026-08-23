'use client'
// @ts-nocheck

import { useEffect, useRef, useState } from 'react'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export default function PartnerMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  async function loadMessages() {
    try {
      const res = await fetch('/api/partner/messages')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load messages')
      setMessages(json.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/partner/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      setMessages((prev) => [...prev, json.data])
      setInput('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center">Loading messages...</div>

  return (
    <div>
      <h1 className="cinzel-text text-2xl text-on-surface mb-6">Messages</h1>
      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6"><p className="text-sm text-red-400">{error}</p></div>}

      <div className="bg-surface-container border border-outline-variant/10 flex flex-col h-[550px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-on-surface-variant/60 text-sm">No messages yet. Send a message to the CZAAH team below.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="text-sm">
                <div className="text-xs text-on-surface-variant/40 mb-1">{new Date(m.created_at).toLocaleString()}</div>
                <div className="bg-surface-container-high text-on-surface-variant px-4 py-3 max-w-[85%] leading-relaxed">{m.content}</div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-outline-variant/10 p-3 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Type a message to the CZAAH team..."
            rows={2}
            className="flex-1 bg-surface-container-low border border-outline-variant/20 px-3 py-2 text-sm text-on-surface resize-none"
          />
          <button onClick={send} disabled={sending || !input.trim()} className="px-4 py-2 bg-primary text-on-primary text-sm disabled:opacity-40 transition-opacity">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
