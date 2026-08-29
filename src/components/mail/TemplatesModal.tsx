'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import RichTextEditor from './RichTextEditor'

const VARS = ['{{recipient_name}}', '{{recipient_email}}', '{{my_name}}', '{{my_email}}', '{{subject}}', '{{date}}']

export default function TemplatesModal({ mailboxId, canShare, onClose }: any) {
  const [list, setList] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    const r = await fetch(`/api/mail/templates?mailboxId=${mailboxId}`)
    const j = await r.json()
    setList(j.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  function blank() {
    setEditing({ name: '', category: '', subject: '', bodyHtml: '', isShared: false })
  }

  async function save() {
    setErr(null)
    const isNew = !editing.id
    const res = await fetch(isNew ? '/api/mail/templates' : `/api/mail/templates/${editing.id}`, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editing, mailboxId }),
    })
    const j = await res.json()
    if (!res.ok) { setErr(j.error || 'Save failed.'); return }
    setEditing(null)
    load()
  }

  async function remove(id: string) {
    await fetch(`/api/mail/templates/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} className="czaah-mail" style={{ width: '640px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--mail-panel)', border: '1px solid var(--mail-border)', borderRadius: '12px', padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '17px', color: 'var(--mail-text)', margin: 0 }}>Email templates</h2>
          <button className="mi-btn" onClick={onClose}>Close</button>
        </div>

        {!editing ? (
          <>
            <button className="mi-primary" onClick={blank} style={{ marginBottom: '12px' }}>New template</button>
            {loading ? <p style={{ color: 'var(--mail-text-faint)', fontSize: '13px' }}>Loading…</p> : list.length === 0 ? (
              <p style={{ color: 'var(--mail-text-faint)', fontSize: '13px' }}>No templates yet.</p>
            ) : (
              list.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--mail-border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: 'var(--mail-text)', fontWeight: 600 }}>
                      {t.name}
                      {t.scope === 'shared' && <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--mail-accent)', border: '1px solid var(--mail-accent-dim)', borderRadius: '6px', padding: '1px 5px' }}>shared</span>}
                      {t.category && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--mail-text-faint)' }}>{t.category}</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--mail-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject || '—'}</div>
                  </div>
                  <button className="mi-btn" onClick={() => setEditing({ ...t })}>Edit</button>
                  <button className="mi-btn is-danger" onClick={() => remove(t.id)}>Delete</button>
                </div>
              ))
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input className="mi-input" placeholder="Template name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input className="mi-input" placeholder="Category (optional)" value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              {canShare && (
                <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: 'var(--mail-text-dim)', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={!!editing.isShared} onChange={(e) => setEditing({ ...editing, isShared: e.target.checked })} /> Org-wide
                </label>
              )}
            </div>
            <input className="mi-input" placeholder="Subject (optional)" value={editing.subject || ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
            <RichTextEditor value={editing.bodyHtml} onChange={(h) => setEditing({ ...editing, bodyHtml: h })} placeholder="Template body…" minHeight={150} />
            <p style={{ fontSize: '11px', color: 'var(--mail-text-faint)', margin: 0 }}>
              Variables: {VARS.join('  ')}
            </p>
            {err && <p style={{ color: 'var(--mail-danger)', fontSize: '12px', margin: 0 }}>{err}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="mi-btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="mi-primary" onClick={save} disabled={!editing.name.trim()}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
