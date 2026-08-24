'use client'

// Browsers require a real user gesture to start an AudioContext. A call
// ringing in via a realtime event has no gesture of its own to lean on, so
// this unlocks one shared context on the page's first click/tap/keypress —
// which will always have already happened by the time anyone is far enough
// into the app to receive a call — and every ringtone reuses that same
// already-running context instead of creating (and failing to unlock) a
// fresh one per call.

let sharedContext: AudioContext | null = null
let listenersAttached = false

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  )
}

function unlock() {
  const Ctor = getAudioContextClass()
  if (!Ctor) return
  if (!sharedContext) {
    sharedContext = new Ctor()
  }
  if (sharedContext.state === 'suspended') {
    sharedContext.resume().catch(() => {})
  }
}

export function primeAudioUnlock() {
  if (listenersAttached || typeof window === 'undefined') return
  listenersAttached = true
  const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart']
  events.forEach((evt) => window.addEventListener(evt, unlock, { passive: true }))
}

export function getSharedAudioContext(): AudioContext | null {
  const Ctor = getAudioContextClass()
  if (!Ctor) return null
  if (!sharedContext) {
    sharedContext = new Ctor()
  }
  return sharedContext
}
