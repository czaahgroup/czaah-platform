'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  link: string | null
  is_read: boolean
  created_at: string
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Fetch unread count
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count')
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count ?? 0)
      }
    } catch { /* silent */ }
  }, [])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications((data.data ?? []).slice(0, 10))
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  // Poll unread count every 30s
  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [fetchCount])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Open dropdown
  const handleToggle = useCallback(() => {
    setOpen(v => {
      if (!v) fetchNotifications()
      return !v
    })
  }, [fetchNotifications])

  // Mark all read
  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch { /* silent */ }
  }, [])

  // Click notification
  const handleNotificationClick = useCallback(async (n: Notification) => {
    if (!n.is_read) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: n.id }),
        })
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch { /* silent */ }
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }, [router])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Bell icon SVG */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#C9A84C',
            color: '#000',
            fontSize: '10px',
            fontWeight: 700,
            fontFamily: "'Raleway', sans-serif",
            width: unreadCount > 9 ? '20px' : '16px',
            height: '16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '360px',
          maxHeight: '400px',
          background: '#080808',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '8px',
          overflow: 'hidden',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '13px',
              letterSpacing: '2px',
              color: 'rgba(255,255,255,0.8)',
              textTransform: 'uppercase',
            }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '11px',
                  color: '#C9A84C',
                  letterSpacing: '0.5px',
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px' }}>
            {loading ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '12px',
                color: 'rgba(255,255,255,0.3)',
              }}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '12px',
                color: 'rgba(255,255,255,0.3)',
              }}>No notifications yet</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    background: n.is_read ? 'transparent' : 'rgba(201,168,76,0.03)',
                    borderLeft: n.is_read ? '3px solid transparent' : '3px solid #C9A84C',
                    borderRight: 'none',
                    borderTop: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(201,168,76,0.03)')}
                >
                  <div style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '12px',
                    fontWeight: n.is_read ? 400 : 600,
                    color: n.is_read ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.9)',
                    marginBottom: '4px',
                    lineHeight: 1.3,
                  }}>{n.title}</div>
                  <div style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.35)',
                    lineHeight: 1.4,
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{n.body}</div>
                  <div style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.2)',
                  }}>{timeAgo(n.created_at)}</div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <a
            href="/dashboard/notifications"
            style={{
              display: 'block',
              padding: '12px 16px',
              textAlign: 'center',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: '#C9A84C',
              textDecoration: 'none',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            View All
          </a>
        </div>
      )}
    </div>
  )
}
