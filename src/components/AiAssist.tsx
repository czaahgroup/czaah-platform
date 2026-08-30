'use client'
// @ts-nocheck

import { useState } from 'react'

const DOC_TYPES = [
  ['cover_letter', 'Cover letter'],
  ['mou_outline', 'MoU outline'],
  ['proposal_summary', 'Proposal summary'],
  ['meeting_brief', 'Meeting brief'],
  ['client_update', 'Client status update'],
]

/**
 * Combined AI panel for a CRM / module detail page: a briefing and an
 * on-demand document draft. Degrades cleanly when Workers AI is off.
 * `type` must be a crm_object value (contact | company | deal |
 * construction_project | commodity_trade).
 */
export default function AiAssist({ type, id }: { type: string; id: string }) {
  const [brief, setBrief] = useState<{ state: string; text: string; msg: string }>({ state: 'idle', text: '', msg: '' })

  const [docType, setDocType] = useState('cover_letter')
  const [instr, setInstr] = useState('')
  const [doc, setDoc] = useState<{ state: string; title: string; body: string; msg: string }>({ state: 'idle', title: '', body: '', msg: '' })
  const [saved, setSaved] = useState(false)

  async function runBrief() {
    setBrief({ state: 'loading', text: '', msg: '' })
    try {
      const res = await fetch('/api/ai/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id }) })
      const j = await res.json()
      if (!res.ok) return setBrief({ state: 'error', text: '', msg: j.error || 'Failed' })
      if (j.configured === false) return setBrief({ state: 'off', text: '', msg: j.message })
      setBrief({ state: 'done', text: j.text || '', msg: '' })
    } catch { setBrief({ state: 'error', text: '', msg: 'Request failed' }) }
  }

  async function runDoc() {
    setDoc((d) => ({ ...d, state: 'loading', msg: '' })); setSaved(false)
    try {
      const res = await fetch('/api/ai/document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id, docType, instructions: instr }) })
      const j = await res.json()
      if (!res.ok) return setDoc((d) => ({ ...d, state: 'error', msg: j.error || 'Failed' }))
      if (j.configured === false) return setDoc((d) => ({ ...d, state: 'off', msg: j.message }))
      setDoc({ state: 'done', title: j.title || '', body: j.body || '', msg: '' })
    } catch { setDoc((d) => ({ ...d, state: 'error', msg: 'Request failed' })) }
  }

  async function saveAsNote() {
    const body = `${doc.title}\n\n${doc.body}`.trim()
    const res = await fetch('/api/crm/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id, body }) })
    if (res.ok) setSaved(true)
  }

  return (
    <div className="mt-3 border-t border-outline-variant/10 pt-3 space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-on-surface-variant/50">AI briefing</span>
          <button onClick={runBrief} disabled={brief.state === 'loading'} className="text-xs text-primary hover:text-primary/80 disabled:opacity-40">
            {brief.state === 'loading' ? 'Thinking…' : brief.state === 'done' ? 'Regenerate' : 'Generate'}
          </button>
        </div>
        {brief.state === 'done' && <p className="text-sm text-on-surface mt-2 whitespace-pre-wrap">{brief.text}</p>}
        {(brief.state === 'off' || brief.state === 'error') && <p className={`text-xs mt-2 ${brief.state === 'error' ? 'text-red-400' : 'text-on-surface-variant/60'}`}>{brief.msg}</p>}
      </div>

      <div>
        <span className="text-xs uppercase tracking-wide text-on-surface-variant/50">Draft a document</span>
        <div className="flex flex-wrap gap-2 mt-2">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-1.5 text-on-surface text-xs">
            {DOC_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input value={instr} onChange={(e) => setInstr(e.target.value)} placeholder="extra instructions (optional)"
            className="flex-1 min-w-[160px] bg-surface-container-lowest border border-outline-variant/10 px-2 py-1.5 text-on-surface text-xs" />
          <button onClick={runDoc} disabled={doc.state === 'loading'} className="text-xs text-primary border border-primary/30 px-3 py-1.5 hover:bg-primary/10 disabled:opacity-40">
            {doc.state === 'loading' ? 'Drafting…' : '✦ Draft'}
          </button>
        </div>
        {(doc.state === 'off' || doc.state === 'error') && <p className={`text-xs mt-2 ${doc.state === 'error' ? 'text-red-400' : 'text-on-surface-variant/60'}`}>{doc.msg}</p>}
        {doc.state === 'done' && (
          <div className="mt-2">
            <input value={doc.title} onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant/10 px-2 py-1.5 text-on-surface text-sm font-medium mb-1" />
            <textarea value={doc.body} onChange={(e) => setDoc((d) => ({ ...d, body: e.target.value }))} rows={10} className="w-full bg-surface-container-lowest border border-outline-variant/10 px-2 py-2 text-on-surface text-sm resize-y" />
            <div className="flex gap-2 mt-1.5">
              <button onClick={saveAsNote} disabled={saved} className="text-xs text-primary border border-primary/30 px-3 py-1 disabled:opacity-50">{saved ? 'Saved as note ✓' : 'Save as note'}</button>
              <button onClick={() => navigator.clipboard?.writeText(`${doc.title}\n\n${doc.body}`)} className="text-xs text-on-surface-variant border border-outline-variant/20 px-3 py-1">Copy</button>
            </div>
            <p className="text-[10px] text-on-surface-variant/40 mt-1.5">AI draft — review every figure and clause before use.</p>
          </div>
        )}
      </div>
    </div>
  )
}
