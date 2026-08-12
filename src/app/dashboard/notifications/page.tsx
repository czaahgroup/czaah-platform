'use client'
// @ts-nocheck

import { useState, useEffect, useCallback } from 'react'

interface Notification { id: string; title: string; body: string; type: string; link: string | null; is_read: boolean; created_at: string }

function timeAgo(dateStr: string): string { const now = Date.now(); const date = new Date(dateStr).getTime(); const diff = Math.floor((now - date) / 1000); if (diff < 60) return 'just now'; if (diff < 3600) return `${Math.floor(diff / 60)}m ago`; if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`; if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`; return new Date(dateStr).toLocaleDateString() }

function typeIcon(type: string): string { switch (type) { case 'enquiry': return 'mail'; case 'kyc': return 'verified_user'; case 'investment': return 'trending_up'; case 'chat': return 'chat'; case 'system': return 'settings'; case 'broadcast': return 'campaign'; default: return 'circle' } }

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const fetchNotifications = useCallback(async () => { setLoading(true); try { const res = await fetch('/api/notifications'); if (res.ok) { const data = await res.json(); setNotifications(data.data ?? []) } } catch {}; setLoading(false) }, [])
  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markAllRead = async () => { try { await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))) } catch {} }
  const markOneRead = async (id: string) => { try { await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: id }) }); setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n)) } catch {} }
  const handleClick = (n: Notification) => { if (!n.is_read) markOneRead(n.id); if (n.link) window.location.href = n.link }

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="cinzel-text text-2xl font-semibold text-on-surface tracking-[4px] m-0">NOTIFICATIONS</h1>
          <p className="raleway-text text-sm text-on-surface-variant/40 mt-2">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="bg-primary/10 border border-primary/30 px-4 py-2 cursor-pointer raleway-text text-xs text-primary tracking-wide transition-colors hover:bg-primary/15">Mark All as Read</button>
        )}
      </div>

      <div className="flex gap-1 mb-6">
        {(['all', 'unread'] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)} className={`px-5 py-2 cursor-pointer raleway-text text-xs tracking-wide uppercase transition-all ${filter === tab ? 'bg-primary/10 border border-primary/30 text-primary' : 'bg-transparent border border-outline-variant/10 text-on-surface-variant/40 hover:text-on-surface-variant'}`}>{tab}{tab === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}</button>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center raleway-text text-sm text-on-surface-variant/30">Loading notifications...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center raleway-text text-sm text-on-surface-variant/30">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</div>
        ) : (
          filtered.map(n => (
            <div key={n.id} onClick={() => handleClick(n)} className={`flex items-start gap-3.5 px-5 py-4 border-b border-outline-variant/5 transition-colors cursor-pointer hover:bg-surface-container/50 ${!n.is_read ? 'border-l-2 border-l-primary bg-primary/[0.02]' : 'border-l-2 border-l-transparent'}`}>
              <div className="w-9 h-9 bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>{typeIcon(n.type)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className={`raleway-text text-sm ${n.is_read ? 'font-normal text-on-surface/60' : 'font-semibold text-on-surface/90'} leading-snug`}>{n.title}</span>
                  <span className="raleway-text text-[10px] text-on-surface/20 shrink-0">{timeAgo(n.created_at)}</span>
                </div>
                <div className="raleway-text text-xs text-on-surface-variant/35 mt-1 leading-relaxed">{n.body}</div>
              </div>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                {!n.is_read && (
                  <button onClick={e => { e.stopPropagation(); markOneRead(n.id) }} title="Mark as read" className="bg-transparent border-none cursor-pointer p-1 text-on-surface-variant/30 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>done</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
