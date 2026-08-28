'use client'
// @ts-nocheck

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Mailbox {
  id: string
  address: string
  displayName: string | null
}

interface ThreadSummary {
  id: string
  subject: string
  externalAddress: string
  lastMessageAt: string
  preview: string
  unreadCount: number
}

interface MailMessage {
  id: string
  direction: 'inbound' | 'outbound'
  from_address: string
  to_address: string
  subject: string
  body_text: string | null
  created_at: string
  mailbox_attachments: { id: string; filename: string; content_type: string; size: number }[]
}

export default function AdminMailPage() {
  const supabase = createClient()
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [mailboxId, setMailboxId] = useState<string>('')
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MailMessage[]>([])
  const [threadInfo, setThreadInfo] = useState<{ subject: string; externalAddress: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/mail/mailboxes')
      .then((res) => res.json())
      .then((json) => {
        const list: Mailbox[] = json.data || []
        setMailboxes(list)
        if (list.length && !mailboxId) setMailboxId(list[0].id)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadThreads = useCallback(async () => {
    if (!mailboxId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/mail/threads?mailboxId=${mailboxId}`)
      const json = await res.json()
      if (res.ok) setThreads(json.data || [])
    } finally {
      setLoading(false)
    }
  }, [mailboxId])

  useEffect(() => {
    setSelectedId(null)
    setMessages([])
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    setThreadLoading(true)
    fetch(`/api/mail/threads/${selectedId}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        setMessages(json.messages || [])
        setThreadInfo(json.thread || null)
        loadThreads()
      })
      .finally(() => { if (!cancelled) setThreadLoading(false) })
    return () => { cancelled = true }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!selectedId) return
    const channel = supabase
      .channel(`admin-mailbox-messages-${selectedId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mailbox_messages', filter: `thread_id=eq.${selectedId}` },
        (payload: { new: MailMessage }) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendReply() {
    if (!selectedId || !replyText.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/mail/threads/${selectedId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to send.')
        return
      }
      setMessages((prev) => (prev.some((m) => m.id === json.data.id) ? prev : [...prev, json.data]))
      setReplyText('')
      loadThreads()
    } finally {
      setSending(false)
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 0) return time
    if (diffDays === 1) return `Yesterday ${time}`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${time}`
  }

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '24px', color: '#fff', margin: 0 }}>Partner Mail</h1>
        <select
          value={mailboxId}
          onChange={(e) => setMailboxId(e.target.value)}
          style={{
            background: '#0e0e0e',
            border: '1px solid rgba(77,70,55,0.4)',
            color: '#fff',
            padding: '8px 12px',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
          }}
        >
          {mailboxes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName || m.address} ({m.address})
            </option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 0, border: '1px solid rgba(77,70,55,0.25)', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ background: '#0e0e0e', borderRight: '1px solid rgba(77,70,55,0.25)', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'Raleway', sans-serif", fontSize: '13px' }}>Loading...</div>
          ) : threads.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'Raleway', sans-serif", fontSize: '13px' }}>No mail yet.</div>
          ) : (
            threads.map((t) => {
              const isSelected = t.id === selectedId
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isSelected ? 'rgba(201,168,76,0.05)' : 'transparent',
                    borderLeft: isSelected ? '2px solid rgba(201,168,76,0.6)' : '2px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#fff', fontWeight: t.unreadCount > 0 ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.externalAddress}
                    </span>
                    {t.unreadCount > 0 && (
                      <span style={{ background: '#e6c364', color: '#000', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>{t.unreadCount}</span>
                    )}
                  </div>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(201,168,76,0.6)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.preview}</p>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>{formatTime(t.lastMessageAt)}</p>
                </div>
              )
            })
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', background: '#000' }}>
          {!selectedId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>Select a conversation</p>
            </div>
          ) : threadLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>Loading...</p>
            </div>
          ) : (
            <>
              {threadInfo && (
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(77,70,55,0.25)', background: '#0e0e0e' }}>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#fff', margin: '0 0 2px', fontWeight: 500 }}>{threadInfo.subject}</p>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(201,168,76,0.5)', margin: 0 }}>
                    with {threadInfo.externalAddress}
                  </p>
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.map((m) => {
                  const isMine = m.direction === 'outbound'
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%',
                        padding: '10px 14px',
                        borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isMine ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isMine ? 'rgba(201,168,76,0.2)' : 'rgba(77,70,55,0.25)'}`,
                      }}>
                        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 6px' }}>
                          {isMine ? 'Partner' : m.from_address}
                        </p>
                        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: isMine ? '#fff' : 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {m.body_text}
                        </p>
                        {m.mailbox_attachments?.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {m.mailbox_attachments.map((a) => (
                              <span key={a.id} style={{ fontSize: '11px', color: 'rgba(201,168,76,0.7)', border: '1px solid rgba(201,168,76,0.3)', padding: '3px 8px' }}>
                                📎 {a.filename}
                              </span>
                            ))}
                          </div>
                        )}
                        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '6px 0 0', textAlign: 'right' }}>{formatTime(m.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>

              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(77,70,55,0.25)', background: '#0e0e0e' }}>
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
                  Replying as this partner&apos;s mailbox — monitor view.
                </p>
                {error && <p style={{ color: '#ef4444', fontFamily: "'Raleway', sans-serif", fontSize: '12px', margin: '0 0 8px' }}>{error}</p>}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '10px 14px',
                      color: '#fff',
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'none',
                      minHeight: '44px',
                    }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    style={{
                      background: replyText.trim() ? '#e6c364' : 'rgba(201,168,76,0.3)',
                      border: 'none',
                      padding: '10px 20px',
                      cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#000',
                      flexShrink: 0,
                    }}
                  >
                    {sending ? 'Sending…' : 'Reply'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          div[style*="grid-template-columns: 320px 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
