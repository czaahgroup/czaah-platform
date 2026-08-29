'use client'
// @ts-nocheck

import { useEffect, useRef, useState } from 'react'
import TemplatesModal from './TemplatesModal'
import { resolveVars } from '@/lib/mailVars'

const LANGS = ['Arabic', 'French', 'Urdu', 'Chinese (Simplified)', 'Spanish', 'German', 'Portuguese', 'Russian']
const TONES = ['Formal', 'Friendly', 'Direct', 'Warm', 'Apologetic', 'Persuasive']

/**
 * Toolbar strip above the editor: Templates picker + AI actions
 * (draft / improve / translate / summarize). Shared by composer and reply.
 */
export default function MailAssist({
  ctx,
  getHtml,
  onInsert,
  onSubject,
  mode,
  canShareTemplates,
}: {
  ctx: any
  getHtml: () => string
  onInsert: (html: string) => void
  onSubject?: (s: string) => void
  mode: 'compose' | 'reply'
  canShareTemplates?: boolean
}) {
  const [templates, setTemplates] = useState<any[]>([])
  const [aiOn, setAiOn] = useState(false)
  const [open, setOpen] = useState<'' | 'tpl' | 'ai' | 'lang' | 'tone'>('')
  const [busy, setBusy] = useState<string>('')
  const [manageOpen, setManageOpen] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const loadTemplates = () => {
    if (!ctx.mailboxId) return
    fetch(`/api/mail/templates?mailboxId=${ctx.mailboxId}`).then((r) => r.json()).then((j) => setTemplates(j.data || []))
  }
  useEffect(loadTemplates, [ctx.mailboxId]) // eslint-disable-line
  useEffect(() => { fetch('/api/mail/ai').then((r) => r.json()).then((j) => setAiOn(!!j.configured)) }, [])

  useEffect(() => {
    const h = (e: any) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen('') }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function applyTemplate(t: any) {
    setOpen('')
    if (t.subject && onSubject) onSubject(resolveVars(t.subject, ctx))
    onInsert(resolveVars(t.bodyHtml || '', ctx))
  }

  async function runAi(action: string, extra: any = {}) {
    setErr(null); setBusy(action); setOpen('')
    try {
      const res = await fetch('/api/mail/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, threadId: ctx.threadId, mailboxId: ctx.mailboxId, ...extra }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j.error || 'AI request failed.'); return }
      if (action === 'summarize') setSummary(j.result)
      else onInsert(j.result)
    } finally {
      setBusy('')
    }
  }

  const menuStyle: React.CSSProperties = {
    position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, background: 'var(--mail-panel-2)',
    border: '1px solid var(--mail-border-strong)', borderRadius: '8px', padding: '6px', zIndex: 40, minWidth: '200px',
    maxHeight: '260px', overflowY: 'auto',
  }
  const item: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
    color: 'var(--mail-text)', fontSize: '12px', padding: '7px 9px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit',
  }

  return (
    <div ref={wrapRef} style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
      {/* Templates */}
      <div style={{ position: 'relative' }}>
        <button type="button" className="mi-btn" onClick={() => setOpen(open === 'tpl' ? '' : 'tpl')}>Templates ▾</button>
        {open === 'tpl' && (
          <div style={menuStyle}>
            {templates.length === 0 && <p style={{ ...item, color: 'var(--mail-text-faint)', cursor: 'default' }}>No templates</p>}
            {templates.map((t) => (
              <button key={t.id} style={item} onClick={() => applyTemplate(t)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mail-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                {t.name}{t.scope === 'shared' ? ' ·' : ''}
              </button>
            ))}
            <button style={{ ...item, color: 'var(--mail-accent)', borderTop: '1px solid var(--mail-border)', marginTop: '4px' }} onClick={() => { setOpen(''); setManageOpen(true) }}>
              Manage templates…
            </button>
          </div>
        )}
      </div>

      {/* AI */}
      {aiOn && (
        <div style={{ position: 'relative' }}>
          <button type="button" className="mi-btn" onClick={() => setOpen(open === 'ai' ? '' : 'ai')} disabled={!!busy}>
            {busy ? `${busy[0].toUpperCase()}${busy.slice(1)}…` : 'AI ✦ ▾'}
          </button>
          {open === 'ai' && (
            <div style={menuStyle}>
              {mode === 'reply' && ctx.threadId && (
                <button style={item} onClick={() => {
                  const instruction = window.prompt('Anything specific this reply should say or do? (optional)') || ''
                  runAi('draft', { instruction })
                }}>Draft a reply</button>
              )}
              <button style={item} onClick={() => runAi('improve', { text: getHtml() })} disabled={!getHtml().replace(/<[^>]+>/g, '').trim()}>Improve writing</button>
              <button style={item} onClick={() => setOpen('lang')}>Translate ▸</button>
              <button style={item} onClick={() => setOpen('tone')}>Rewrite in tone ▸</button>
              {ctx.threadId && <button style={item} onClick={() => runAi('summarize')}>Summarise thread</button>}
            </div>
          )}
          {open === 'lang' && (
            <div style={menuStyle}>
              {LANGS.map((l) => (
                <button key={l} style={item} onClick={() => runAi('translate', { text: getHtml(), targetLang: l })}>{l}</button>
              ))}
            </div>
          )}
          {open === 'tone' && (
            <div style={menuStyle}>
              {TONES.map((tn) => (
                <button key={tn} style={item} onClick={() => runAi('improve', { text: getHtml(), tone: tn })}>{tn}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {err && <span style={{ color: 'var(--mail-danger)', fontSize: '11px' }}>{err}</span>}

      {manageOpen && (
        <TemplatesModal mailboxId={ctx.mailboxId} canShare={canShareTemplates} onClose={() => { setManageOpen(false); loadTemplates() }} />
      )}

      {summary && (
        <div onClick={() => setSummary(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '16px' }}>
          <div onClick={(e) => e.stopPropagation()} className="czaah-mail" style={{ width: '480px', maxWidth: '100%', background: 'var(--mail-panel)', border: '1px solid var(--mail-border)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '15px', color: 'var(--mail-text)', margin: '0 0 10px' }}>Thread summary</h3>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', color: 'var(--mail-text-dim)', lineHeight: 1.6, margin: 0 }}>{summary}</pre>
            <div style={{ textAlign: 'right', marginTop: '14px' }}>
              <button className="mi-btn" onClick={() => { navigator.clipboard?.writeText(summary); }}>Copy</button>
              <button className="mi-primary" style={{ marginLeft: '8px' }} onClick={() => setSummary(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
