'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getAiChatReply, isHandoffIntent } from '@/lib/aiChatKnowledge'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hello, I'm CZAAH AI. Ask me about our sectors, services, or how our investment process works — or ask to connect with our team.",
}

const HANDOFF_PROMPT =
  "Of course — I can send your message straight to our team. Just confirm your name and email below and I'll pass it on."

export function AiChatWidget() {
  const pathname = usePathname() || ''
  const hidden = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [handoffOpen, setHandoffOpen] = useState(false)
  const [handoffName, setHandoffName] = useState('')
  const [handoffEmail, setHandoffEmail] = useState('')
  const [handoffMessage, setHandoffMessage] = useState('')
  const [handoffSending, setHandoffSending] = useState(false)
  const [handoffError, setHandoffError] = useState<string | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open, handoffOpen])

  if (hidden) return null

  const send = () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)

    if (isHandoffIntent(text)) {
      setMessages((prev) => [...prev, { role: 'assistant', content: HANDOFF_PROMPT }])
      setHandoffMessage(text)
      setHandoffError(null)
      setHandoffOpen(true)
      return
    }

    setLoading(true)
    // Small delay for a natural "typing" feel — reply is computed instantly and locally.
    const reply = getAiChatReply(text)
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      setLoading(false)
    }, 450 + Math.random() * 350)
  }

  const submitHandoff = async () => {
    const name = handoffName.trim()
    const email = handoffEmail.trim()
    const message = handoffMessage.trim()

    if (!name || !email || !message) {
      setHandoffError('Please fill in your name, email, and a short message.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setHandoffError('Please enter a valid email address.')
      return
    }

    setHandoffSending(true)
    setHandoffError(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, interest: 'AI Chat Handoff', message, source: 'ai_chat' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Could not send your message. Please try again.')

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Thanks, ${name} — your message has been sent to our team. They'll respond to ${email} within 24 hours.`,
        },
      ])
      setHandoffOpen(false)
      setHandoffName('')
      setHandoffEmail('')
      setHandoffMessage('')
    } catch (err) {
      setHandoffError(err instanceof Error ? err.message : 'Could not send your message. Please try again.')
    } finally {
      setHandoffSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[92vw] max-w-[380px] h-[70vh] max-h-[560px] bg-surface-container border border-outline-variant/20 shadow-2xl flex flex-col overflow-hidden rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10 bg-surface-container-lowest">
            <div>
              <div className="cinzel-text text-sm font-semibold text-on-surface">CZAAH AI</div>
              <div className="raleway-text text-[11px] text-on-surface-variant/60">Ask about our sectors &amp; services</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-on-surface-variant hover:text-primary transition-colors text-xl leading-none px-2"
            >
              &times;
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`raleway-text text-sm leading-relaxed px-4 py-3 max-w-[85%] ${
                  m.role === 'user'
                    ? 'self-end bg-primary/15 text-on-surface rounded-2xl rounded-br-sm'
                    : 'self-start bg-surface-container-high text-on-surface-variant rounded-2xl rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="self-start bg-surface-container-high text-on-surface-variant rounded-2xl rounded-bl-sm px-4 py-3 raleway-text text-sm">
                &hellip;
              </div>
            )}

            {handoffOpen && (
              <div className="self-stretch bg-surface-container-high border border-outline-variant/10 rounded-lg p-4 flex flex-col gap-3">
                <div className="raleway-text text-xs font-semibold tracking-[0.1em] uppercase text-primary">Send to our team</div>
                <input
                  type="text"
                  value={handoffName}
                  onChange={(e) => setHandoffName(e.target.value)}
                  placeholder="Your name"
                  className="bg-surface-container border border-outline-variant/20 rounded-md px-3 py-2 text-sm text-on-surface raleway-text placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-colors"
                />
                <input
                  type="email"
                  value={handoffEmail}
                  onChange={(e) => setHandoffEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-surface-container border border-outline-variant/20 rounded-md px-3 py-2 text-sm text-on-surface raleway-text placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-colors"
                />
                <textarea
                  value={handoffMessage}
                  onChange={(e) => setHandoffMessage(e.target.value)}
                  placeholder="Your message"
                  rows={3}
                  className="bg-surface-container border border-outline-variant/20 rounded-md px-3 py-2 text-sm text-on-surface raleway-text placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-colors resize-none"
                />
                {handoffError && <div className="raleway-text text-xs text-red-400">{handoffError}</div>}
                <div className="flex gap-2">
                  <button
                    onClick={submitHandoff}
                    disabled={handoffSending}
                    className="liquid-gold-bg text-on-primary px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-40 transition-opacity flex-1"
                  >
                    {handoffSending ? 'Sending…' : 'Send to our team'}
                  </button>
                  <button
                    onClick={() => { setHandoffOpen(false); setHandoffError(null) }}
                    disabled={handoffSending}
                    className="raleway-text text-xs text-on-surface-variant/60 hover:text-primary transition-colors px-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-outline-variant/10 p-3 flex items-end gap-2 bg-surface-container-lowest">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              rows={1}
              className="flex-1 resize-none bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface raleway-text placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-colors max-h-24"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="liquid-gold-bg text-on-primary px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-40 transition-opacity"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close CZAAH AI chat' : 'Open CZAAH AI chat'}
        className="liquid-gold-bg text-on-primary rounded-full shadow-xl w-16 h-16 flex flex-col items-center justify-center gap-0.5 hover:scale-105 transition-transform"
      >
        {open ? (
          <span className="text-2xl leading-none">&times;</span>
        ) : (
          <>
            <span className="material-symbols-outlined text-2xl leading-none">smart_toy</span>
            <span className="raleway-text text-[9px] font-bold tracking-wide leading-none">CZAAH AI</span>
          </>
        )}
      </button>
    </div>
  )
}
