'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

// Admin → Submissions: what owners, developers and partners sent from
// property.czaah.com/sell. Nothing here is public until converted and then
// approved in Admin → Properties.

type Row = Record<string, any>

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Pending review',
  contacted: 'Contacted',
  approved: 'Approved',
  converted: 'Converted to listing',
  rejected: 'Rejected',
  spam: 'Spam',
}
const KIND_LABEL: Record<string, string> = {
  sell: 'Sell',
  let: 'Let',
  development: 'Development',
  partnership: 'Partnership',
}
const card: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface-container-low, #111)', padding: '16px 18px', marginBottom: 14 }
const ghost: React.CSSProperties = { background: 'transparent', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }
const gold: React.CSSProperties = { background: '#C9A84C', color: '#000', border: 'none', padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const pill = (s: string): React.CSSProperties => ({
  fontSize: 11, padding: '2px 8px', borderRadius: 999,
  background: s === 'pending_review' ? 'rgba(245,158,11,0.18)' : s === 'converted' || s === 'approved' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
  color: s === 'pending_review' ? '#f59e0b' : s === 'converted' || s === 'approved' ? '#22c55e' : 'rgba(228,224,218,0.7)',
})

function money(amount: unknown, ccy: unknown) {
  if (amount == null) return null
  return `${ccy || ''} ${Number(amount).toLocaleString('en-GB')}`.trim()
}

export default function SubmissionsAdminPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [filter, setFilter] = useState('pending_review')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/admin/submissions${filter ? `?status=${filter}` : ''}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load submissions.')
      setRows(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load submissions.')
    }
  }, [filter])
  useEffect(() => { setRows(null); load() }, [load])

  async function act(id: string, method: 'PATCH' | 'POST', body: Row, done: string) {
    setBusy(id)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/submissions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Action failed.')
      setNotice(done)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Submissions</h1>
      <p style={{ fontSize: 13, color: 'rgba(228,224,218,0.6)', maxWidth: 700 }}>
        Properties, developments and partnership requests sent from property.czaah.com/sell. None of this is
        public. Converting a sell or let submission creates a <strong>pending</strong> listing, which you then check
        and approve in <Link href="/admin/properties" style={{ color: '#C9A84C' }}>Properties</Link>.
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '16px 0' }}>
        {[['pending_review', 'Pending review'], ['contacted', 'Contacted'], ['converted', 'Converted'], ['rejected', 'Rejected'], ['spam', 'Spam'], ['', 'All']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setFilter(v)} style={{ ...ghost, ...(filter === v ? { borderColor: '#C9A84C', color: '#C9A84C' } : {}) }}>{l}</button>
        ))}
      </div>

      {error && <div style={{ ...card, borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }}>{error}</div>}
      {notice && <div style={{ ...card, borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e' }}>{notice}</div>}
      {!rows && !error && <div>Loading…</div>}
      {rows && rows.length === 0 && <div style={{ ...card, opacity: 0.7 }}>Nothing here.</div>}

      {rows?.map((r) => {
        const facts: [string, unknown][] = [
          ['Email', r.email], ['Phone', r.phone], ['Company', r.company],
          ['Location', [r.address, r.city, r.country].filter(Boolean).join(', ')],
          ['Property type', r.property_type], ['Bedrooms', r.bedrooms], ['Bathrooms', r.bathrooms],
          ['Size', r.size_value ? `${r.size_value} ${r.size_unit || ''}` : null],
          ['Expected price', money(r.expected_price, r.currency)],
          ['Expected rent', r.expected_rent != null ? `${money(r.expected_rent, r.currency)} / ${r.rent_period}` : null],
          ['Available from', r.available_from], ['Furnishing', r.furnishing], ['Timeline', r.timeline],
          ['Development', r.development_name], ['Units', r.units_count], ['Completion', r.completion],
          ['Partner type', r.partner_type], ['Markets', r.markets], ['Website', r.website],
        ].filter(([, v]) => v != null && v !== '') as [string, unknown][]
        return (
          <div key={r.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{r.full_name}</strong>
                <span style={{ fontSize: 12, opacity: 0.6 }}>{r.reference} · {KIND_LABEL[r.kind]} · {new Date(r.created_at).toLocaleString()}</span>
                <span style={pill(r.status)}>{STATUS_LABEL[r.status] || r.status}</span>
              </span>
              <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                {(r.kind === 'sell' || r.kind === 'let') && !r.listing_id && (
                  <button type="button" style={gold} disabled={busy === r.id}
                    onClick={() => window.confirm('Create a PENDING listing from this submission? You will review it in Properties before it goes live.') &&
                      act(r.id, 'POST', {}, 'Listing created as pending — review and approve it in Properties.')}>
                    Convert to listing
                  </button>
                )}
                {r.listing_id && <Link href="/admin/properties" style={{ ...ghost, textDecoration: 'none' }}>Open in Properties</Link>}
                {r.status !== 'contacted' && r.status !== 'converted' && (
                  <button type="button" style={ghost} disabled={busy === r.id} onClick={() => act(r.id, 'PATCH', { status: 'contacted' }, 'Marked as contacted.')}>Mark contacted</button>
                )}
                {r.status !== 'rejected' && r.status !== 'converted' && (
                  <button type="button" style={ghost} disabled={busy === r.id} onClick={() => act(r.id, 'PATCH', { status: 'rejected' }, 'Rejected.')}>Reject</button>
                )}
                {r.status !== 'spam' && r.status !== 'converted' && (
                  <button type="button" style={ghost} disabled={busy === r.id} onClick={() => act(r.id, 'PATCH', { status: 'spam' }, 'Marked as spam.')}>Spam</button>
                )}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px 18px', marginTop: 12, fontSize: 13 }}>
              {facts.map(([k, v]) => (
                <div key={k}><span style={{ opacity: 0.55 }}>{k}: </span>{String(v)}</div>
              ))}
            </div>
            {r.message && <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', margin: '10px 0 0', opacity: 0.9 }}>{r.message}</p>}

            {r.image_urls?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {r.image_urls.map((u: string, i: number) => (
                  <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                    <img src={u} alt={`Photo ${i + 1} from ${r.full_name}`} style={{ width: 120, height: 90, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </a>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-start' }}>
              <textarea
                rows={2}
                placeholder="Internal notes (not shared with the sender)"
                value={notes[r.id] ?? r.admin_notes ?? ''}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                style={{ flex: 1, background: 'var(--surface-container-lowest, #0a0a0a)', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 10px', fontSize: 13, color: 'inherit', resize: 'vertical' }}
              />
              <button type="button" style={ghost} disabled={busy === r.id || notes[r.id] === undefined}
                onClick={() => act(r.id, 'PATCH', { admin_notes: notes[r.id] }, 'Notes saved.')}>Save notes</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
