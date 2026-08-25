'use client'

// Named ring-tone presets — each a pair of tone frequencies played together,
// like a real phone's dual-tone ring. Stored per-browser in localStorage
// (a ringtone choice is inherently a "this device" preference, same as how
// phones handle it) rather than synced to the account.

export interface RingtonePreset {
  id: string
  label: string
  frequencies: number[]
}

export const RINGTONE_PRESETS: RingtonePreset[] = [
  { id: 'classic', label: 'Classic', frequencies: [440, 480] },
  { id: 'chime', label: 'Chime', frequencies: [523, 659] },
  { id: 'soft', label: 'Soft', frequencies: [349, 440] },
  { id: 'alert', label: 'Alert', frequencies: [587, 740] },
]

const STORAGE_KEY = 'czaah-ringtone-preset'
const DEFAULT_PRESET_ID = 'classic'

export function getRingtonePreset(): RingtonePreset {
  if (typeof window !== 'undefined') {
    try {
      const savedId = window.localStorage.getItem(STORAGE_KEY)
      const found = RINGTONE_PRESETS.find((p) => p.id === savedId)
      if (found) return found
    } catch {
      // Storage unavailable (private mode, etc.) — fall through to default
    }
  }
  return RINGTONE_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!
}

export function setRingtonePreset(id: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Best-effort
  }
}

// A short standalone preview, independent of any call state — used by the
// ringtone picker in settings so choosing one plays a sample immediately.
export function previewRingtone(preset: RingtonePreset, ctx: AudioContext) {
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.15, now + 0.05)
  gain.gain.setValueAtTime(0.15, now + 0.6)
  gain.gain.linearRampToValueAtTime(0, now + 0.7)
  gain.connect(ctx.destination)

  preset.frequencies.forEach((f) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = f
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + 0.7)
  })
}

// Vibration pattern for an incoming call, mirrored to match the ring
// cadence. No-op on devices/browsers without the Vibration API (notably
// iOS Safari, which doesn't implement it at all).
export function vibrateForRing() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate([400, 200, 400, 1600])
  } catch {
    // Best-effort
  }
}

export function stopVibration() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(0)
  } catch {
    // Best-effort
  }
}
