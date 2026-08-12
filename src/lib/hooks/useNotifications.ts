'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  link: string | null
  is_read: boolean
  created_at: string
}

interface UseNotificationsOptions {
  userId: string
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (notificationId: string) => Promise<void>
  markAllRead: () => Promise<void>
  loading: boolean
}

export function useNotifications({ userId }: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Fetch initial notifications
  useEffect(() => {
    let cancelled = false

    async function fetchNotifications() {
      setLoading(true)
      try {
        const res = await fetch('/api/notifications')
        if (!res.ok) throw new Error('Failed to fetch notifications')
        const data = await res.json()
        if (!cancelled) {
          setNotifications(data.notifications ?? [])
        }
      } catch {
        // Silently handle
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (userId) fetchNotifications()
    return () => { cancelled = true }
  }, [userId])

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotification.id)) return prev
            return [newNotification, ...prev]
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      if (!res.ok) throw new Error('Failed to mark as read')

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
      )
    } catch {
      // Silently handle
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (!res.ok) throw new Error('Failed to mark all as read')

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // Silently handle
    }
  }, [])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    loading,
  }
}
