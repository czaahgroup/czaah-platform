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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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

  const filtered = messages
    .filter((m) => (statusFilter === 'all' ? true : m.status === statusFilter))
    .filter((m) => (sourceFilter === 'all' ? true : m.source === sourceFilter))

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

      {filtered.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center">
          <p className="text-on-surface-variant">No messages found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const isExpanded = expandedId === m.id
            return (
              <div
                key={m.id}
                className={`bg-surface-container-low border transition-colors ${
                  m.status === 'new' ? 'border-primary/40' : 'border-outline-variant/10'
                }`}
              >
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : m.id)
                    if (m.status === 'new') updateStatus(m.id, 'read')
                  }}
                  className="w-full text-left px-5 py-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-on-surface truncate">{m.name}</span>
                        <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_BADGES[m.status] || ''}`}>{m.status}</span>
                        <span className="text-xs px-2 py-0.5 shrink-0 bg-primary/10 text-primary">{SOURCE_LABELS[m.source] || m.source}</span>
                      </div>
                      <div className="text-xs text-on-surface-variant space-x-2">
                        <span>{m.email}</span>
                        {m.phone && <span>· {m.phone}</span>}
                      </div>
                      <div className="text-xs text-on-surface-variant/50 mt-1">{m.interest}</div>
                    </div>
                    <div className="text-xs text-on-surface-variant/50 shrink-0">
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-outline-variant/10 pt-4">
                    <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap mb-4">{m.message}</p>
                    <div className="flex gap-2 flex-wrap items-center">
                      <a
                        href={`mailto:${m.email}`}
                        className="text-xs px-3 py-1.5 border border-primary/40 text-primary hover:border-primary transition-colors"
                      >
                        Reply by Email
                      </a>
                      {m.status !== 'replied' && (
                        <button
                          onClick={() => updateStatus(m.id, 'replied')}
                          disabled={updatingId === m.id}
                          className="text-xs px-3 py-1.5 border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 transition-colors disabled:opacity-40"
                        >
                          Mark as Replied
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
