'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { VERIFICATION_CHECKS } from '@/lib/verification'

// Admin → Verification: the only way a listing or development gets the public
// "Verified" badge. Every required check must be ticked and a note written;
// who verified it and when are recorded (and shown here).

type Row = Record<string, any>
type Target = 'listing' | 'development'
const card: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface-container-low, #111)', padding: '12px 16px', marginBottom: 8 }
const input: React.CSSProperties = { width: '100%', background: 'var(--surface-container-lowest, #0a0a0a)', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 10px', fontSize: 13, color: 'inherit' }
const ghost: React.CSSProperties = { background: 'transparent', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }
const gold: React.CSSProperties = { background: '#C9A84C', color: '#000', border: 'none', padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const tab = (on: boolean): React.CSSProperties => ({ ...ghost, borderColor: on ? '#C9A84C' : 'rgba(255,255,255,0.2)', color: on ? '#C9A84C' : 'inherit' })

function state(r: Row): 'verified' | 'unrecorded' | 'none' {
  if (!r.verified) return 'none'
  return r.verified_by && r.verification_checks ? 'verified' : 'unrecorded'
}

export default function VerificationPage() {
  const [data, setData] = useState<{ listings: Row[]; developments: Row[] } | null>(null)
  const [target, setTarget] = useState<Target>('listing')
  const [filter, setFilter] = useState<'all' | 'verified' | 'unrecorded' | 'none'>('all')
  const [editing, setEditing] = useState<{ id: string; mode: 'verify' | 'remove'; checks: Record<string, boolean>; notes: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/verification')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load.')
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load.')
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function submit() {
    if (!editing) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, id: editing.id, verified: editing.mode === 'verify', checks: editing.checks, notes: editing.notes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed.')
      setNotice(editing.mode === 'verify' ? 'Verified — the badge is now live.' : 'Verification removed — the badge is gone.')
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setBusy(false)
    }
  }

  const all = data ? (target === 'listing' ? data.listings : data.developments) : []
  const rows = all.filter((r) => filter === 'all' || state(r) === filter)
  const unrecorded = data ? [...data.listings, ...data.developments].filter((r) => state(r) === 'unrecorded').length : 0

  function form(r: Row) {
    if (!editing || editing.id !== r.id) return null
    const e = editing
    return (
      <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
        {e.mode === 'verify' ? (
          <>
            <p style={{ fontSize: 12.5, opacity: 0.7, margin: '0 0 8px' }}>Tick only what CZAAH has actually done. The first three are required.</p>
            {VERIFICATION_CHECKS.map((c) => (
              <label key={c.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, margin: '6px 0' }}>
                <input type="checkbox" checked={!!e.checks[c.key]} onChange={(x) => setEditing({ ...e, checks: { ...e.checks, [c.key]: x.target.checked } })} />
                <span>{c.label}{c.required ? ' *' : ''}</span>
              </label>
            ))}
          </>
        ) : (
          <p style={{ fontSize: 12.5, opacity: 0.7, margin: '0 0 8px' }}>The public badge is removed straight away. Say why, for the record.</p>
        )}
        <textarea style={{ ...input, resize: 'vertical', marginTop: 6 }} rows={3} value={e.notes}
          placeholder={e.mode === 'verify' ? 'What was checked: document names/refs, who you spoke to, dates…' : 'Reason for removing verification…'}
          onChange={(x) => setEditing({ ...e, notes: x.target.value })} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" style={e.mode === 'verify' ? gold : { ...ghost, borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }} disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : e.mode === 'verify' ? 'Verify' : 'Remove verification'}
          </button>
          <button type="button" style={ghost} onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 28, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Verification</h1>
      <p style={{ fontSize: 13, opacity: 0.65, maxWidth: 740, lineHeight: 1.6 }}>
        A &ldquo;Verified&rdquo; badge on property.czaah.com means CZAAH has confirmed the owner&apos;s identity, seen ownership or approval documents,
        and confirmed the price, size and location. That is what the public site says it means. Developers are verified under{' '}
        <Link href="/admin/developers" style={{ color: '#C9A84C' }}>Developers</Link>.
      </p>
      {unrecorded > 0 && (
        <div style={{ ...card, borderColor: 'rgba(245,158,11,0.5)', fontSize: 13 }}>
          <strong>{unrecorded} item{unrecorded === 1 ? ' is' : 's are'} showing a Verified badge with no record of the checks.</strong>{' '}
          They were marked verified before this page existed. Re-verify each with its checks, or remove the badge.{' '}
          <button type="button" style={{ ...ghost, marginLeft: 6 }} onClick={() => setFilter('unrecorded')}>Show them</button>
        </div>
      )}
      {error && <div style={{ ...card, borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }}>{error}</div>}
      {notice && <div style={{ ...card, borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e' }}>{notice}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
        <button type="button" style={tab(target === 'listing')} onClick={() => { setTarget('listing'); setEditing(null) }}>Listings{data ? ` (${data.listings.length})` : ''}</button>
        <button type="button" style={tab(target === 'development')} onClick={() => { setTarget('development'); setEditing(null) }}>Developments{data ? ` (${data.developments.length})` : ''}</button>
        <select style={{ ...input, width: 'auto', marginLeft: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter">
          <option value="all">All</option>
          <option value="verified">Verified</option>
          <option value="unrecorded">Verified — no record</option>
          <option value="none">Not verified</option>
        </select>
      </div>

      {!data && !error && <div>Loading…</div>}
      {data && rows.length === 0 && <div style={{ ...card, opacity: 0.7 }}>Nothing here.</div>}
      {rows.map((r) => {
        const s = state(r)
        return (
          <div key={r.id} style={{ ...card, borderLeft: `3px solid ${s === 'verified' ? '#22c55e' : s === 'unrecorded' ? '#f59e0b' : 'rgba(255,255,255,0.15)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ minWidth: 0 }}>
                <strong>{r.title || r.name}</strong>
                <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 8 }}>{[r.city, r.country].filter(Boolean).join(', ')} · {r.status}{r.developer_name ? ` · ${r.developer_name}` : ''}</span>
                <div style={{ fontSize: 12, marginTop: 4, color: s === 'verified' ? '#22c55e' : s === 'unrecorded' ? '#f59e0b' : 'rgba(228,224,218,0.55)' }}>
                  {s === 'verified' && `Verified by ${r.verified_by_name} on ${new Date(r.verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  {s === 'unrecorded' && 'Shows a Verified badge — no record of who checked what'}
                  {s === 'none' && 'Not verified'}
                </div>
                {r.verification_notes && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, whiteSpace: 'pre-wrap' }}>Note: {r.verification_notes}</div>}
              </span>
              <span style={{ display: 'inline-flex', gap: 6 }}>
                {s !== 'verified' && <button type="button" style={ghost} onClick={() => setEditing({ id: r.id, mode: 'verify', checks: {}, notes: '' })}>{s === 'unrecorded' ? 'Re-verify…' : 'Verify…'}</button>}
                {s !== 'none' && <button type="button" style={{ ...ghost, borderColor: 'rgba(239,68,68,0.45)', color: '#ef4444' }} onClick={() => setEditing({ id: r.id, mode: 'remove', checks: {}, notes: '' })}>Remove badge…</button>}
              </span>
            </div>
            {form(r)}
          </div>
        )
      })}
    </div>
  )
}
