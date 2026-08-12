'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { ChatPanel } from '@/components/chat/ChatPanel'


interface ChatEnquiry {
  id: string
  reference_number: string
  status: string
  assigned_admin_id: string | null
  member_id: string
  member_name: string
  member_company: string | null
  admin_name: string | null
  last_message: string | null
  last_message_at: string | null
  message_count: number
}

const STATUS_BADGES: Record<string, string> = {
  submitted: 'bg-yellow-500/20 text-yellow-400',
  assigned: 'bg-blue-500/20 text-blue-400',
  active: 'bg-green-500/20 text-green-400',
  waiting: 'bg-orange-500/20 text-orange-400',
  resolved: 'bg-neutral-500/20 text-neutral-400',
  archived: 'bg-neutral-500/20 text-neutral-400',
}

export default function AdminChatsPage() {
  const [chats, setChats] = useState<ChatEnquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    loadChats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadChats() {
    try {
      const res = await fetch('/api/admin/chats')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load chats')

      setCurrentUserId(json.currentUserId || '')
      setChats(json.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const selected = chats.find((c) => c.id === selectedId)

  if (loading) {
    return (
      <div className="text-on-surface-variant py-12 text-center">Loading chats...</div>
    )
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-6">
        Chat Monitor
      </h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {chats.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-16 text-center">
          <p className="text-on-surface-variant">No active chats with messages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Chat list */}
          <div className="xl:col-span-2 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedId(chat.id)}
                className={`w-full text-left rounded-none px-5 py-4 transition-colors ${
                  selectedId === chat.id
                    ? 'bg-surface-container-low border-primary border'
                    : 'bg-surface-container-low border border-outline-variant/10 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-on-surface">
                    {chat.reference_number}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-none${STATUS_BADGES[chat.status] || ''}`}>
                    {chat.status}
                  </span>
                </div>
                <div className="text-xs text-on-surface-variant space-y-0.5">
                  <p>
                    Member: {chat.member_name}
                    {chat.member_company && <span className="text-on-surface-variant/50"> ({chat.member_company})</span>}
                  </p>
                  {chat.admin_name && <p>Admin: {chat.admin_name}</p>}
                </div>
                {chat.last_message && (
                  <p className="text-xs text-on-surface-variant/50 mt-1.5 truncate">
                    {chat.last_message}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-on-surface-variant/50">
                    {chat.message_count} message{chat.message_count !== 1 ? 's' : ''}
                  </span>
                  {chat.last_message_at && (
                    <span className="text-[10px] text-on-surface-variant/50">
                      {new Date(chat.last_message_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Chat view */}
          <div className="xl:col-span-3">
            {selected ? (
              <div className="bg-surface-container-low border border-outline-variant/10 rounded-none h-[calc(100vh-200px)] flex flex-col">
                <div className="px-6 py-3 border-b border-outline-variant/10 flex items-center justify-between">
                  <div>
                    <h2 className="font-[family-name:var(--font-heading)] text-sm text-on-surface">
                      {selected.reference_number}
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      {selected.member_name}
                      {selected.admin_name && ` / ${selected.admin_name}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-none${STATUS_BADGES[selected.status] || ''}`}>
                    {selected.status}
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatPanel
                    enquiryId={selected.id}
                    currentUserId={currentUserId}
                    userRole="super_admin"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low border border-outline-variant/10 rounded-none flex items-center justify-center py-16 h-[calc(100vh-200px)]">
                <p className="text-on-surface-variant text-sm">Select a chat to monitor</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
