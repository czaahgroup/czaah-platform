'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'

interface Broadcast { id: string; title: string; content: string; sent_by: string; target_roles: string[]; sent_at: string; read_count: number; total_targeted: number; is_read: boolean; sender_name: string }

export default function DashboardBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadBroadcasts = useCallback(async () => { try { const res = await fetch('/api/admin/broadcasts'); if (res.ok) { const json = await res.json(); setBroadcasts(json.data || []) } } catch (err) { console.error('Failed to load broadcasts:', err) } finally { setLoading(false) } }, [])
  useEffect(() => { loadBroadcasts() }, [loadBroadcasts])

  async function handleExpand(broadcastId: string) {
    setExpandedId((prev) => (prev === broadcastId ? null : broadcastId))
    const bc = broadcasts.find((b) => b.id === broadcastId)
    if (bc && !bc.is_read) { try { await fetch(`/api/admin/broadcasts/${broadcastId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); loadBroadcasts() } catch (err) { console.error('Failed to mark broadcast as read:', err) } }
  }

  function formatDate(dateStr: string) { return new Date(dateStr).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) }
  function formatTime(dateStr: string) { const d = new Date(dateStr); const now = new Date(); const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)); if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (diffDays === 1) return 'Yesterday'; if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' }); return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) }

  if (loading) return <div><h1 className="cinzel-text text-2xl text-on-surface mb-2 tracking-wide">Broadcasts</h1><p className="raleway-text text-sm text-on-surface-variant/40 mb-8">Loading broadcasts...</p></div>

  return (
    <div>
      <h1 className="cinzel-text text-2xl text-on-surface mb-2 tracking-wide">Broadcasts</h1>
      <p className="raleway-text text-sm text-on-surface-variant/40 mb-8">Important announcements from the CZAAH team</p>

      {broadcasts.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/10 p-16 text-center">
          <p className="cinzel-text text-base text-on-surface/50 mb-2">No broadcasts</p>
          <p className="raleway-text text-xs text-on-surface/30">Announcements from the team will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {broadcasts.map((bc) => {
            const isExpanded = expandedId === bc.id
            return (
              <div key={bc.id} onClick={() => handleExpand(bc.id)} className={`bg-surface-container-lowest border border-outline-variant/10 overflow-hidden cursor-pointer transition-all hover:border-outline-variant/20 ${!bc.is_read ? 'border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}>
                <div className="px-5 py-4 flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className={`cinzel-text text-[15px] text-on-surface m-0 tracking-wide ${bc.is_read ? 'font-normal' : 'font-semibold'}`}>{bc.title}</h3>
                      {!bc.is_read && <span className="bg-primary/20 text-primary text-[9px] font-bold px-2 py-0.5 raleway-text tracking-wider uppercase shrink-0">NEW</span>}
                    </div>
                    {!isExpanded && <p className="raleway-text text-xs text-on-surface-variant/40 mt-1 truncate">{bc.content.substring(0, 120)}{bc.content.length > 120 ? '...' : ''}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                    <span className="raleway-text text-[11px] text-on-surface/30">{formatTime(bc.sent_at)}</span>
                    <span className="raleway-text text-[10px] text-on-surface/25">from {bc.sender_name}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-outline-variant/5">
                    <div className="p-4 bg-surface/30 mt-4">
                      <p className="raleway-text text-sm text-on-surface/80 m-0 leading-relaxed whitespace-pre-wrap">{bc.content}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="raleway-text text-[11px] text-on-surface/30">Sent on {formatDate(bc.sent_at)}</span>
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
