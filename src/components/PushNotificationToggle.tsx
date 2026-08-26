'use client'

import { useEffect, useState } from 'react'
import { isPushSupported, getExistingSubscription, enablePushNotifications, disablePushNotifications } from '@/lib/pushNotifications'

const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPushSupported()) {
      setSupported(false)
      return
    }
    getExistingSubscription().then((sub) => setEnabled(!!sub))
  }, [])

  async function handleToggle() {
    setError(null)
    setLoading(true)
    try {
      if (enabled) {
        await disablePushNotifications()
        setEnabled(false)
      } else {
        const result = await enablePushNotifications()
        if (result.success) {
          setEnabled(true)
        } else {
          setError(result.error || 'Failed to enable notifications.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <div className="max-w-lg mt-6">
        <label className={labelClass}>Call Notifications</label>
        <p className="raleway-text text-xs text-on-surface-variant/40">
          Not supported in this browser. On iPhone, add this site to your Home Screen first, then enable notifications from there.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mt-6">
      <label className={labelClass}>Call Notifications</label>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`text-xs px-4 py-2 border transition-colors raleway-text disabled:opacity-40 ${
          enabled ? 'border-primary text-primary bg-primary/5' : 'border-outline-variant/20 text-on-surface-variant hover:border-primary/40'
        }`}
      >
        {loading ? 'Working…' : enabled ? 'Enabled — tap to disable' : 'Enable notifications for incoming calls'}
      </button>
      {error && <p className="raleway-text text-xs text-red-400 mt-2">{error}</p>}
      <p className="raleway-text text-xs text-on-surface-variant/40 mt-2">
        Lets you be notified of an incoming call even if this tab isn&apos;t open or focused, on this device.
      </p>
    </div>
  )
}
