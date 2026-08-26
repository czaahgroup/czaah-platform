'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'

interface PublicMessage {
  id: string
  name: string
  email: string
  phone: string | null
  interest: string
  message: string
  source: 'contact_form' | 'ai_chat'
  status: 'new' | 'read' | 'replied'
  created_at: string
}

const STATUS_BADGES: Record<string, string> = {
  new: 'bg-yellow-500/20 text-yellow-400',
  read: 'bg-blue-500/20 text-blue-400',
  replied: 'bg-green-500/20 text-green-400',
}

const SOURCE_LABELS: Record<string, string> = {
  contact_form: 'Contact Form',
  ai_chat: 'CZAAH AI',
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<PublicMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replySentId, setReplySentId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    try {
      const res = await fetch('/api/admin/messages')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load messages')
      setMessages(json.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update status')
      }
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: status as PublicMessage['status'] } : m)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  async function sendReply(id: string) {
    if (!replyText.trim() || sendingReply) return
    setSendingReply(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, replyContent: replyText.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send reply')
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'replied' } : m)))
      setReplyText('')
      setReplySentId(id)
      setTimeout(() => setReplySentId(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  const filtered = messages
    .filter((m) => (statusFilter === 'all' ? true : m.status === statusFilter))
    .filter((m) => (sourceFilter === 'all' ? true : m.source === sourceFilter))

  const selected = filtered.find((m) => m.id === selectedId) || messages.find((m) => m.id === selectedId) || null

  function selectMessage(m: PublicMessage) {
    setSelectedId(m.id)
    setReplyText('')
    if (m.status === 'new') updateStatus(m.id, 'read')
  }

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading messages...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Website Messages</h1>
        <div className="flex gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/10 px-3 py-1.5 text-sm text-on-surface"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/10 px-3 py-1.5 text-sm text-on-surface"
          >
            <option value="all">All Sources</option>
            <option value="contact_form">Contact Form</option>
            <option value="ai_chat">CZAAH AI</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center">
              <p className="text-on-surface-variant">No messages found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMessage(m)}
                  className={`w-full text-left px-5 py-4 border transition-colors ${
                    selectedId === m.id
                      ? 'bg-surface-container-low border-primary'
                      : m.status === 'new'
                      ? 'bg-surface-container-low border-primary/40 hover:border-primary'
                      : 'bg-surface-container-low border-outline-variant/10 hover:border-primary/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-on-surface truncate">{m.name}</span>
                        <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_BADGES[m.status] || ''}`}>{m.status}</span>
                        <span className="text-xs px-2 py-0.5 shrink-0 bg-primary/10 text-primary">{SOURCE_LABELS[m.source] || m.source}</span>
                      </div>
                      <div className="text-xs text-on-surface-variant/60 truncate">{m.interest}</div>
                    </div>
                    <div className="text-xs text-on-surface-variant/50 shrink-0">
                      {new Date(m.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-3">
          {!selected ? (
            <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center h-full flex items-center justify-center">
              <p className="text-on-surface-variant">Select a message to view and reply.</p>
            </div>
          ) : (
            <div className="bg-surface-container-low border border-outline-variant/10">
              <div className="px-6 py-4 border-b border-outline-variant/10">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">{selected.name}</h2>
                  <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_BADGES[selected.status] || ''}`}>{selected.status}</span>
                </div>
                <div className="text-xs text-on-surface-variant space-x-2">
                  <span>{selected.email}</span>
                  {selected.phone && <span>· {selected.phone}</span>}
                  <span>· {new Date(selected.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="px-6 py-4 space-y-3 border-b border-outline-variant/10">
                <div>
                  <p className="text-xs text-on-surface-variant">Interest</p>
                  <p className="text-sm text-on-surface">{selected.interest}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Message</p>
                  <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{selected.message}</p>
                </div>
              </div>

              <div className="px-6 py-4">
                <label className="block text-sm text-on-surface-variant mb-2">Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Type a reply to ${selected.name}...`}
                  rows={4}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 px-4 py-2.5 text-sm text-on-surface mb-3 resize-none"
                />
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    onClick={() => sendReply(selected.id)}
                    disabled={sendingReply || !replyText.trim()}
                    className="text-sm px-5 py-2.5 bg-primary text-on-primary font-semibold disabled:opacity-50 transition-opacity"
                  >
                    {sendingReply ? 'Sending...' : replySentId === selected.id ? 'Sent ✓' : 'Send Reply'}
                  </button>
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-sm px-4 py-2.5 border border-primary/40 text-primary hover:border-primary transition-colors"
                  >
                    Reply by Email
                  </a>
                  {selected.status !== 'replied' && (
                    <button
                      onClick={() => updateStatus(selected.id, 'replied')}
                      disabled={updatingId === selected.id}
                      className="text-sm px-4 py-2.5 border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 transition-colors disabled:opacity-40"
                    >
                      Mark as Replied
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
