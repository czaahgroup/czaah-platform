'use client'
// @ts-nocheck

import { useState } from 'react'
import RichTextEditor from './RichTextEditor'
import { buildCzaahSignature } from '@/lib/mailSignature'

/**
 * Per-mailbox signature editor. Default "Branded" mode builds a professional
 * CZAAH signature (logo + name + title + phone + website) from a few fields;
 * "Custom" mode drops to a raw rich-text editor.
 */
export default function SignatureModal({ mailbox, onClose, onSaved }: any) {
  const looksBranded = (mailbox?.signatureHtml || '').includes('czaah.com/favicon')
  const [mode, setMode] = useState<'branded' | 'custom'>(
    mailbox?.signatureHtml && !looksBranded ? 'custom' : 'branded'
  )
  const [name, setName] = useState(mailbox?.displayName || '')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [custom, setCustom] = useState(mailbox?.signatureHtml || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const brandedHtml = buildCzaahSignature({ name, title, phone, email: mailbox?.address })
  const finalHtml = mode === 'branded' ? brandedHtml : custom

  async function save() {
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/mail/mailboxes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailboxId: mailbox.id, signatureHtml: finalHtml }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j.error || 'Failed to save.'); return }
      onSaved(finalHtml)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="czaah-mail"
        style={{ width: '600px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--mail-panel)', border: '1px solid var(--mail-border)', borderRadius: '12px', padding: '24px' }}
      >
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '17px', color: 'var(--mail-text)', margin: '0 0 4px' }}>Email signature</h2>
        <p style={{ fontSize: '12px', color: 'var(--mail-text-faint)', margin: '0 0 16px' }}>
          Appended to every message sent from <strong>{mailbox?.address}</strong>.
        </p>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          <button className={`mi-btn ${mode === 'branded' ? 'is-active' : ''}`} onClick={() => setMode('branded')}>Branded</button>
          <button className={`mi-btn ${mode === 'custom' ? 'is-active' : ''}`} onClick={() => setMode('custom')}>Custom HTML</button>
        </div>

        {mode === 'branded' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input className="mi-input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="mi-input" placeholder="Title / role (e.g. Managing Partner)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="mi-input" placeholder="Phone (e.g. +44 20 1234 5678)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        ) : (
          <RichTextEditor value={custom} onChange={setCustom} placeholder="Your name, title, phone…" minHeight={130} />
        )}

        <div style={{ marginTop: '18px' }}>
          <p style={{ fontSize: '11px', color: 'var(--mail-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Preview</p>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '18px' }}>
            <div dangerouslySetInnerHTML={{ __html: finalHtml }} />
          </div>
        </div>

        {err && <p style={{ color: 'var(--mail-danger)', fontSize: '12px', margin: '10px 0 0' }}>{err}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button className="mi-btn" onClick={onClose}>Cancel</button>
          <button className="mi-primary" onClick={save} disabled={saving || (mode === 'branded' && !name.trim())}>
            {saving ? 'Saving…' : 'Save signature'}
          </button>
        </div>
      </div>
    </div>
  )
}
