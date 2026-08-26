'use client'

// Thin wrapper around @mmmike/web-push's client helpers, pointed at this
// app's subscribe/unsubscribe routes. The service worker (public/sw.js)
// handles the actual `push`/`notificationclick` events once subscribed.

import {
  isPushSupported as libIsPushSupported,
  getNotificationPermission,
  subscribe,
  getCurrentSubscription,
  unsubscribe,
  sendSubscriptionToServer,
  removeSubscriptionFromServer,
} from '@mmmike/web-push/client'

export function isPushSupported(): boolean {
  return libIsPushSupported()
}

export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return getNotificationPermission()
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  return getCurrentSubscription()
}

export async function enablePushNotifications(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications are not supported in this browser.' }
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) {
    return { success: false, error: 'Push notifications are not configured yet.' }
  }

  const result = await subscribe(publicKey)
  if (result.status === 'denied') {
    return { success: false, error: 'Notification permission was not granted.' }
  }
  if (result.status === 'unsupported') {
    return { success: false, error: 'Push notifications are not supported in this browser.' }
  }

  const saved = await sendSubscriptionToServer(result.subscription)
  if (!saved) {
    return { success: false, error: 'Failed to save subscription.' }
  }
  return { success: true }
}

export async function disablePushNotifications(): Promise<void> {
  if (!isPushSupported()) return
  const endpoint = await unsubscribe()
  if (endpoint) {
    await removeSubscriptionFromServer(endpoint)
  }
}
