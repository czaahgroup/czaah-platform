'use client'
// @ts-nocheck

import { useState } from 'react'

/**
 * Drop-in "AI briefing" panel for a CRM / module detail page.
 * Calls POST /api/ai/briefing and degrades cleanly when Workers AI is off.
 */
export default function AiBriefing({ type, id }: { type: string; id: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'off' | 'error'>('idle')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  async function run() {
    setState('loading'); setText(''); setMsg('')
    try {
      const res = await fetch('/api/ai/briefing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id }),
      })
      const j = await res.json()
      if (!res.ok) { setMsg(j.error || 'Failed'); setState('error'); return }
      if (j.configured === false) { setMsg(j.message); setState('off'); return }
      setText(j.text || ''); setState('done')
    } catch {
      setMsg('Request failed'); setState('error')
    }
  }

  return (
    <div className="mt-3 border-t border-outline-variant/10 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-on-surface-variant/50">AI briefing</span>
        <button onClick={run} disabled={state === 'loading'} className="text-xs text-primary hover:text-primary/80 disabled:opacity-40">
          {state === 'loading' ? 'Thinking…' : state === 'done' ? 'Regenerate' : 'Generate'}
        </button>
      </div>
      {state === 'done' && <p className="text-sm text-on-surface mt-2 whitespace-pre-wrap raleway-text">{text}</p>}
      {state === 'off' && <p className="text-xs text-on-surface-variant/60 mt-2">{msg}</p>}
      {state === 'error' && <p className="text-xs text-red-400 mt-2">{msg}</p>}
    </div>
  )
}
