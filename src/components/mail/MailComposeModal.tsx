'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import RichTextEditor from './RichTextEditor'
import AttachmentPicker from './AttachmentPicker'
import MailAssist from './MailAssist'

/**
 * Gmail-style docked composer (bottom-right). Handles New message and Forward
 * (via `initial`). POSTs to /api/mail/threads.
 */
export default function MailComposeModal({
  open,
  onClose,
  onSent,
  mailboxId,
  fromLabel,
  fromEmail,
  canShareTemplates,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSent: (threadId: string) => void
  mailboxId?: string
  fromLabel?: string
  fromEmail?: string
  canShareTemplates?: boolean
  initial?: { to?: string; subject?: string; bodyHtml?: string }
}) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [files, setFiles] = useState<any[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTo(initial?.to || '')
      setSubject(initial?.subject || '')
      setBodyHtml(initial?.bodyHtml || '')
      setCc(''); setBcc(''); setShowCc(false); setFiles([]); setError(null)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const plain = bodyHtml.replace(/<[^>]+>/g, '').trim()
  const uploading = files.some((f) => f.uploading)
  const goodFiles = files.filter((f) => f.path && !f.failed).length
  const ready = to.trim() && subject.trim() && (plain || goodFiles) && !uploading

  async function send() {
    if (sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/mail/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), cc, bcc, subject: subject.trim(), bodyHtml, attachments: files.filter((f) => f.path && !f.failed), mailboxId }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to send.'); return }
      onSent(json.data.id)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="czaah-mail mi-sheet"
      style={{ position: 'fixed', right: '24px', bottom: '0', width: '540px', maxWidth: 'calc(100vw - 32px)', zIndex: 1100, background: 'var(--mail-panel)', border: '1px solid var(--mail-border-strong)', borderBottom: 'none', borderRadius: '12px 12px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}
    >
      <div className="mi-desktop-only" style={{ background: 'var(--mail-panel-2)', padding: '10px 16px', borderRadius: '11px 11px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--mail-text)', fontWeight: 600 }}>
          {initial?.bodyHtml ? 'Forward message' : 'New message'}
          {fromLabel && <span style={{ color: 'var(--mail-text-faint)', fontWeight: 400 }}> — {fromLabel}</span>}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--mail-text-dim)', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      {/* phone: app-style header — close, title, Send (stays above the keyboard) */}
      <div className="mi-mobile-only" style={{ alignItems: 'center', gap: '6px', padding: '8px 12px 8px 6px', borderBottom: '1px solid var(--mail-border)' }}>
        <button className="mi-icon" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--mail-text)' }}>{initial?.bodyHtml ? 'Forward' : 'New message'}</div>
          {fromEmail && <div style={{ fontSize: '12px', color: 'var(--mail-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>from {fromEmail}</div>}
        </div>
        <button className="mi-primary" onClick={send} disabled={sending || !ready}>
          {sending ? 'Sending…' : uploading ? 'Uploading…' : 'Send'}
        </button>
      </div>

      <div className="mi-sheet-body" style={{ padding: '4px 16px', overflowY: 'auto' }}>
        <Row>
          <input className="ci" type="email" inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
          {!showCc && (
            <button onClick={() => setShowCc(true)} style={{ background: 'none', border: 'none', color: 'var(--mail-text-faint)', fontSize: '12px', cursor: 'pointer' }}>Cc/Bcc</button>
          )}
        </Row>
        {showCc && (
          <>
            <Row><input className="ci" inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="Cc" value={cc} onChange={(e) => setCc(e.target.value)} /></Row>
            <Row><input className="ci" inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="Bcc" value={bcc} onChange={(e) => setBcc(e.target.value)} /></Row>
          </>
        )}
        <Row><input className="ci" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} /></Row>

        <div style={{ padding: '10px 0' }}>
          <div style={{ marginBottom: '8px' }}>
            <MailAssist
              mode="compose"
              canShareTemplates={canShareTemplates}
              ctx={{ mailboxId, recipientEmail: to.trim(), subject: subject.trim(), myName: fromLabel, myEmail: fromEmail }}
              getHtml={() => bodyHtml}
              onInsert={setBodyHtml}
              onSubject={setSubject}
            />
          </div>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Write your message…" minHeight={170} />
        </div>

        {files.length > 0 && (
          <div style={{ paddingBottom: '10px' }}>
            <AttachmentPicker files={files} setFiles={setFiles} mailboxId={mailboxId} compact />
          </div>
        )}
        {files.length === 0 && (
          <div className="mi-mobile-only" style={{ paddingBottom: '10px' }}>
            <AttachmentPicker files={files} setFiles={setFiles} mailboxId={mailboxId} compact />
          </div>
        )}
        {error && <p style={{ color: 'var(--mail-danger)', fontSize: '13px', margin: '0 0 10px' }}>{error}</p>}
      </div>

      <div className="mi-desktop-only" style={{ padding: '12px 16px', borderTop: '1px solid var(--mail-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="mi-primary" onClick={send} disabled={sending || !ready}>
          {sending ? 'Sending…' : uploading ? 'Uploading…' : 'Send'}
        </button>
        {files.length === 0 && <AttachmentPicker files={files} setFiles={setFiles} mailboxId={mailboxId} compact />}
      </div>

      <style>{`
        .czaah-mail .ci { flex: 1; background: transparent; border: none; outline: none; color: var(--mail-text); font-size: 13px; font-family: inherit; padding: 10px 0; }
        @media (max-width: 820px) { .czaah-mail .ci { padding: 13px 0; } }
        .czaah-mail .ci::placeholder { color: var(--mail-text-faint); }
      `}</style>
    </div>
  )
}

function Row({ children }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--mail-border)' }}>
      {children}
    </div>
  )
}
