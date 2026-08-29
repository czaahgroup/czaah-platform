'use client'
// @ts-nocheck

import { useEffect, useMemo, useState } from 'react'
import ContactPanel from './ContactPanel'

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--mail-text-faint)',
  lead: '#e37400',
  client: '#188038',
  vendor: '#8430ce',
  archived: 'var(--mail-text-faint)',
}

export default function MailContacts({
  mailboxId,
  onOpenThread,
}: {
  mailboxId?: string
  onOpenThread: (threadId: string, mailboxId: string) => void
}) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (mailboxId) p.set('mailboxId', mailboxId)
    fetch(`/api/mail/contacts?${p}`)
      .then((r) => r.json())
      .then((j) => { setRows(j.data || []); setLoading(false) })
  }, [mailboxId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.email.includes(q) || (r.name || '').toLowerCase().includes(q) || (r.company || '').toLowerCase().includes(q)
    )
  }, [rows, search])

  return (
    <div style={{ gridColumn: '2 / 4', display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)', minHeight: 0 }}>
      <div style={{ borderRight: '1px solid var(--mail-border)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--mail-border)' }}>
          <input className="mi-input" placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <p style={{ fontSize: '11px', color: 'var(--mail-text-faint)', margin: '8px 0 0' }}>{filtered.length} contact{filtered.length === 1 ? '' : 's'}</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--mail-text-faint)' }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--mail-text-faint)' }}>No contacts.</p>
          ) : (
            filtered.map((c) => (
              <div
                key={c.email}
                onClick={() => setSelected(c.email)}
                style={{
                  padding: '11px 14px', cursor: 'pointer', borderBottom: '1px solid var(--mail-border)',
                  background: selected === c.email ? 'var(--mail-accent-soft)' : 'transparent',
                  borderLeft: `2px solid ${selected === c.email ? 'var(--mail-accent)' : 'transparent'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--mail-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name || c.email.split('@')[0]}
                  </span>
                  <span style={{ fontSize: '9px', color: STATUS_COLOR[c.status] || 'var(--mail-text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>{c.status}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--mail-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.company ? `${c.company} · ` : ''}{c.email}
                </div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {c.partnerRef && <span style={{ fontSize: '9px', color: 'var(--mail-accent)', border: '1px solid var(--mail-accent-dim)', borderRadius: '6px', padding: '0 5px' }}>{c.partnerRef}</span>}
                  {(c.tags || []).slice(0, 3).map((t: string) => (
                    <span key={t} style={{ fontSize: '9px', background: 'var(--mail-chip)', borderRadius: '6px', padding: '1px 6px', color: 'var(--mail-text-dim)' }}>{t}</span>
                  ))}
                  <span style={{ fontSize: '10px', color: 'var(--mail-text-faint)', marginLeft: 'auto' }}>{c.threadCount} thread{c.threadCount === 1 ? '' : 's'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ overflowY: 'auto', minWidth: 0 }}>
        {selected ? (
          <ContactPanel key={selected} email={selected} embedded onOpenThread={onOpenThread} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mail-text-faint)', fontSize: '13px' }}>
            Select a contact
          </div>
        )}
      </div>
    </div>
  )
}
