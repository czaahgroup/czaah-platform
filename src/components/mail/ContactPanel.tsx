'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'

const STATUSES = ['active', 'lead', 'client', 'vendor', 'archived']

/**
 * Contact record for one external address — shown as a slide-over in the
 * reader and as the detail pane in the Contacts directory.
 */
export default function ContactPanel({
  email,
  onOpenThread,
  onClose,
  embedded,
}: {
  email: string
  onOpenThread?: (threadId: string, mailboxId: string) => void
  onClose?: () => void
  embedded?: boolean
}) {
  const [data, setData] = useState<any>(null)
  const [form, setForm] = useState<any>(null)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setData(null); setForm(null); setErr(null)
    fetch(`/api/mail/contacts/${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) { setErr(j.error); return }
        setData(j)
        setForm({ ...j.contact })
      })
  }, [email])

  async function save(patch: any) {
    setSaving(true); setErr(null)
    try {
      const res = await fetch(`/api/mail/contacts/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j.error || 'Save failed.'); return }
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  function field(key: string, label: string, placeholder = '') {
    return (
      <label style={{ display: 'block', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mail-text-faint)' }}>{label}</span>
        <input
          className="mi-input"
          style={{ marginTop: '3px' }}
          placeholder={placeholder}
          value={form[key] || ''}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          onBlur={() => form[key] !== (data.contact[key] || '') && save({ [key]: form[key] })}
        />
      </label>
    )
  }

  const body = !form ? (
    <p style={{ padding: '16px', fontSize: '13px', color: 'var(--mail-text-faint)' }}>{err || 'Loading…'}</p>
  ) : (
    <div style={{ padding: embedded ? '4px 2px' : '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--mail-accent-dim)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
          {(form.name || email).trim().charAt(0).toUpperCase()}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', color: 'var(--mail-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.name || email.split('@')[0]}</div>
          <div style={{ fontSize: '11px', color: 'var(--mail-text-faint)' }}>{email}</div>
        </div>
      </div>

      {data.contact.enrichment?.partnerRef && (
        <div style={{ fontSize: '11px', color: 'var(--mail-accent)', border: '1px solid var(--mail-accent-dim)', borderRadius: '6px', padding: '5px 8px', marginBottom: '12px' }}>
          Linked partner · {data.contact.enrichment.partnerRef}
          {data.contact.enrichment.country ? ` · ${data.contact.enrichment.country}` : ''}
        </div>
      )}

      <label style={{ display: 'block', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mail-text-faint)' }}>Status</span>
        <select
          className="mi-input"
          style={{ marginTop: '3px' }}
          value={form.status}
          onChange={(e) => { setForm({ ...form, status: e.target.value }); save({ status: e.target.value }) }}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </label>

      {field('name', 'Name', 'Full name')}
      {field('company', 'Company')}
      {field('title', 'Title / role')}
      {field('phone', 'Phone')}

      <div style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mail-text-faint)' }}>Tags</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', margin: '4px 0' }}>
          {(form.tags || []).map((t: string, i: number) => (
            <span key={i} style={{ fontSize: '11px', background: 'var(--mail-chip)', border: '1px solid var(--mail-border)', borderRadius: '6px', padding: '2px 7px', color: 'var(--mail-text)' }}>
              {t}
              <button onClick={() => { const next = form.tags.filter((_: any, j: number) => j !== i); setForm({ ...form, tags: next }); save({ tags: next }) }}
                style={{ background: 'none', border: 'none', color: 'var(--mail-text-dim)', cursor: 'pointer', marginLeft: '4px' }}>×</button>
            </span>
          ))}
        </div>
        <input
          className="mi-input"
          placeholder="Add tag, press Enter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tagInput.trim()) {
              e.preventDefault()
              const next = [...(form.tags || []), tagInput.trim()]
              setForm({ ...form, tags: next }); save({ tags: next }); setTagInput('')
            }
          }}
        />
      </div>

      <label style={{ display: 'block', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mail-text-faint)' }}>Notes</span>
        <textarea
          className="mi-input"
          style={{ marginTop: '3px', minHeight: '90px', resize: 'vertical' }}
          value={form.notes || ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          onBlur={() => form.notes !== (data.contact.notes || '') && save({ notes: form.notes })}
        />
      </label>

      <div style={{ fontSize: '11px', color: savedAt ? 'var(--mail-accent-dim)' : 'var(--mail-text-faint)', minHeight: '14px' }}>
        {err ? <span style={{ color: 'var(--mail-danger)' }}>{err}</span> : saving ? 'Saving…' : savedAt ? 'Saved' : ''}
      </div>

      <div style={{ borderTop: '1px solid var(--mail-border)', marginTop: '12px', paddingTop: '12px' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mail-text-faint)' }}>
          {data.threads.length} conversation{data.threads.length === 1 ? '' : 's'}
        </span>
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {data.threads.map((t: any) => (
            <button
              key={t.id}
              onClick={() => onOpenThread && onOpenThread(t.id, t.mailboxId)}
              style={{ textAlign: 'left', background: 'var(--mail-hover)', border: '1px solid var(--mail-border)', borderRadius: '6px', padding: '7px 9px', cursor: 'pointer', color: 'var(--mail-text)', fontSize: '12px', fontFamily: 'inherit' }}
            >
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
              <div style={{ fontSize: '10px', color: 'var(--mail-text-faint)' }}>{t.mailboxAddress}{t.archived ? ' · archived' : ''}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (embedded) return <div className="czaah-mail">{body}</div>

  return (
    <div
      className="czaah-mail"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '320px', maxWidth: '85vw', background: 'var(--mail-panel)', borderLeft: '1px solid var(--mail-border-strong)', zIndex: 50, overflowY: 'auto', boxShadow: '-8px 0 30px rgba(0,0,0,0.4)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--mail-border)' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mail-text)' }}>Contact</span>
        <button className="mi-btn" onClick={onClose} style={{ padding: '4px 8px' }}>×</button>
      </div>
      {body}
    </div>
  )
}
