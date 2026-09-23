'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { LEAD_STATUSES, LEAD_STATUS_LABEL, LEAD_KINDS, LEAD_KIND_LABEL, VIEWING_STATUSES, type LeadStatus, type LeadKind } from '@/lib/propertyLeads'

// Admin → Property Leads: every enquiry, viewing request and investment
// enquiry from property.czaah.com. Each lead is linked to its CRM contact;
// "Create CRM deal" qualifies it into the deals pipeline.

type Row = Record<string, any>
const card: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface-container-low, #111)', padding: '14px 16px', marginBottom: 10 }
const input: React.CSSProperties = { width: '100%', background: 'var(--surface-container-lowest, #0a0a0a)', border: '1px solid rgba(255,255,255,0.12)', padding: '7px 9px', fontSize: 13, color: 'inherit' }
const label: React.CSSProperties = { display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6, marginBottom: 4 }
const ghost: React.CSSProperties = { background: 'transparent', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }
const gold: React.CSSProperties = { background: '#C9A84C', color: '#000', border: 'none', padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const STATUS_COLOR: Record<string, string> = { new: '#C9A84C', contacted: '#60a5fa', qualified: '#a78bfa', viewing_booked: '#34d399', offer: '#f59e0b', won: '#22c55e', lost: '#9ca3af', spam: '#ef4444' }
const VIEWING_LABEL: Record<string, string> = { requested: 'Requested', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' }

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
const localInput = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function PropertyLeadsPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [team, setTeam] = useState<Row[]>([])
  const [status, setStatus] = useState('')
  const [kind, setKind] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams()
      if (status) qs.set('status', status)
      if (kind) qs.set('kind', kind)
      const res = await fetch(`/api/admin/property-leads?${qs}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load leads.')
      setRows(json.data || [])
      setTeam(json.team || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load leads.')
    }
  }, [status, kind])
  useEffect(() => { load() }, [load])

  async function call(method: 'PATCH' | 'POST' | 'DELETE', body: Row | null, key: string, query = '') {
    setBusy(key)
    setError(null)
    try {
      const res = await fetch(`/api/admin/property-leads${query}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed.')
      await load()
      return json
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      return null
    } finally {
      setBusy(null)
    }
  }

  const counts = (rows || []).reduce<Record<string, number>>((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {})

  function viewing(v: Row) {
    return (
      <div key={v.id} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '10px 12px', marginTop: 8 }}>
        <div style={{ fontSize: 12.5, marginBottom: 8, opacity: 0.85 }}>
          Viewing — asked for {v.preferred_date ? new Date(v.preferred_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'any date'}{v.preferred_slot ? `, ${v.preferred_slot}` : ''}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 8 }}>
          <div>
            <label style={label}>Status</label>
            <select style={input} value={v.status} disabled={busy === v.id} onChange={(e) => call('PATCH', { viewing_id: v.id, status: e.target.value }, v.id)}>
              {VIEWING_STATUSES.map((s) => <option key={s} value={s}>{VIEWING_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Booked for</label>
            <input type="datetime-local" style={input} defaultValue={localInput(v.scheduled_at)} disabled={busy === v.id}
              onBlur={(e) => { const next = e.target.value ? new Date(e.target.value).toISOString() : null; if (next !== (v.scheduled_at ? new Date(v.scheduled_at).toISOString() : null)) call('PATCH', { viewing_id: v.id, scheduled_at: next }, v.id) }} />
          </div>
          <div>
            <label style={label}>How</label>
            <select style={input} value={v.mode} disabled={busy === v.id} onChange={(e) => call('PATCH', { viewing_id: v.id, mode: e.target.value }, v.id)}>
              <option value="in_person">In person</option>
              <option value="video">Video call</option>
            </select>
          </div>
        </div>
      </div>
    )
  }

  function detail(l: Row) {
    const facts: [string, any][] = [
      ['Email', l.email ? <a href={`mailto:${l.email}`} style={{ color: '#C9A84C' }}>{l.email}</a> : null],
      ['Phone', l.phone ? <a href={`tel:${String(l.phone).replace(/[^\d+]/g, '')}`} style={{ color: '#C9A84C' }}>{l.phone}</a> : null],
      ['Property', l.listing_id ? <Link href={`/property-portal/${l.listing_id}`} target="_blank" style={{ color: '#C9A84C' }}>{l.listing_title} ({l.listing_reference})</Link> : l.listing_title],
      ['Budget', l.budget_amount ? `${l.budget_currency || ''} ${Number(l.budget_amount).toLocaleString('en-GB')}` : null],
      ['Location', [l.city, l.country].filter(Boolean).join(', ') || null],
      ['Property type', l.property_type], ['Funding', l.funding], ['Purpose', l.purpose], ['Timeline', l.timeline],
      ['From page', l.source_page], ['Account', l.user_id ? 'Signed-in buyer' : null],
    ]
    return (
      <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
        {l.message && <p style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 12px' }}>{l.message}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px 18px', fontSize: 13 }}>
          {facts.filter(([, v]) => v).map(([k, v]) => <div key={k}><span style={{ opacity: 0.55 }}>{k}: </span>{v}</div>)}
        </div>
        {(l.viewings || []).map(viewing)}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <div>
            <label style={label}>Status</label>
            <select style={input} value={l.status} disabled={busy === l.id} onChange={(e) => call('PATCH', { id: l.id, status: e.target.value }, l.id)}>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Assigned to</label>
            <select style={input} value={l.assigned_to || ''} disabled={busy === l.id} onChange={(e) => call('PATCH', { id: l.id, assigned_to: e.target.value || null }, l.id)}>
              <option value="">Unassigned</option>
              {team.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={label}>Internal notes</label>
          <textarea style={{ ...input, resize: 'vertical' }} rows={3} value={notes[l.id] ?? l.admin_notes ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [l.id]: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {notes[l.id] !== undefined && notes[l.id] !== (l.admin_notes ?? '') && (
            <button type="button" style={gold} disabled={busy === l.id} onClick={() => call('PATCH', { id: l.id, admin_notes: notes[l.id] }, l.id).then(() => setNotes((n) => { const { [l.id]: _, ...rest } = n; return rest }))}>Save notes</button>
          )}
          {l.deal_id ? (
            <Link href={`/admin/crm/deals/${l.deal_id}`} style={{ ...ghost, textDecoration: 'none' }}>Open CRM deal →</Link>
          ) : (
            <button type="button" style={ghost} disabled={busy === l.id} onClick={() => call('POST', { id: l.id, action: 'create_deal' }, l.id)}>Create CRM deal</button>
          )}
          {l.contact_id && <Link href={`/admin/crm/contacts/${l.contact_id}`} style={{ ...ghost, textDecoration: 'none' }}>CRM contact →</Link>}
          <button type="button" style={{ ...ghost, borderColor: 'rgba(239,68,68,0.45)', color: '#ef4444', marginLeft: 'auto' }} disabled={busy === l.id}
            onClick={() => window.confirm(`Delete lead ${l.reference}? This can't be undone. (To keep it but hide it, set the status to Spam.)`) && call('DELETE', null, l.id, `?id=${l.id}`)}>
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 28, maxWidth: 1050 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Property Leads</h1>
      <p style={{ fontSize: 13, opacity: 0.65, maxWidth: 720, lineHeight: 1.6 }}>
        Enquiries, viewing requests and investment enquiries from property.czaah.com. Each person is also a contact in the CRM. Sell / let submissions are under Submissions.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
        <select style={{ ...input, width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All (except spam)</option>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}{!status && counts[s] ? ` (${counts[s]})` : ''}</option>)}
        </select>
        <select style={{ ...input, width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {LEAD_KINDS.map((k) => <option key={k} value={k}>{LEAD_KIND_LABEL[k]}</option>)}
        </select>
      </div>
      {error && <div style={{ ...card, borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }}>{error}</div>}
      {!rows && !error && <div>Loading…</div>}
      {rows && rows.length === 0 && <div style={{ ...card, opacity: 0.7 }}>No leads{status || kind ? ' match these filters' : ' yet'}.</div>}
      {rows?.map((l) => (
        <div key={l.id} style={{ ...card, borderLeft: `3px solid ${STATUS_COLOR[l.status] || '#666'}` }}>
          <button type="button" onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id}
            style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 12, width: '100%', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', minWidth: 0 }}>
              <strong>{l.name}</strong>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{LEAD_KIND_LABEL[l.kind as LeadKind]} · {l.reference}</span>
              {l.listing_title && <span style={{ fontSize: 12.5, opacity: 0.8 }}>{l.listing_title}</span>}
            </span>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12 }}>
              <span style={{ color: STATUS_COLOR[l.status] }}>{LEAD_STATUS_LABEL[l.status as LeadStatus]}</span>
              <span style={{ opacity: 0.55 }}>{fmt(l.created_at)}</span>
            </span>
          </button>
          {open === l.id && detail(l)}
        </div>
      ))}
    </div>
  )
}
