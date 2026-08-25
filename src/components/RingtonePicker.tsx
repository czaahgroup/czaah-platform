'use client'

import { useState } from 'react'
import { RINGTONE_PRESETS, getRingtonePreset, setRingtonePreset, previewRingtone, vibrateForRing } from '@/lib/ringtones'
import { getSharedAudioContext } from '@/lib/audioUnlock'

const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'

export function RingtonePicker() {
  const [selectedId, setSelectedId] = useState(() => getRingtonePreset().id)

  function choose(id: string) {
    setRingtonePreset(id)
    setSelectedId(id)
    const preset = RINGTONE_PRESETS.find((p) => p.id === id)
    const ctx = getSharedAudioContext()
    if (preset && ctx) {
      ctx.resume().catch(() => {})
      previewRingtone(preset, ctx)
    }
    vibrateForRing()
  }

  return (
    <div className="max-w-lg">
      <label className={labelClass}>Ringtone (this device)</label>
      <div className="flex flex-wrap gap-2">
        {RINGTONE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => choose(preset.id)}
            className={`text-xs px-4 py-2 border transition-colors raleway-text ${
              selectedId === preset.id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-outline-variant/20 text-on-surface-variant hover:border-primary/40'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className="raleway-text text-xs text-on-surface-variant/40 mt-2">
        Tap a name to preview it. This choice is saved on this device/browser only.
      </p>
    </div>
  )
}
