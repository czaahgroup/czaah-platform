'use client'

import { useCallback, useEffect, useState } from 'react'

// Admin → Developers. Projects link to a developer automatically when the
// developer name on the project matches (Admin → Developments keeps its
// free-text "Developer" field).

type Row = Record<string, any>
const card: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface-container-low, #111)', padding: '16px 18px', marginBottom: 14 }
const input: React.CSSProperties = { width: '100%', background: 'var(--surface-container-lowest, #0a0a0a)', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 10px', fontSize: 13, color: 'inherit' }
const label: React.CSSProperties = { display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6, marginBottom: 4 }
const hint: React.CSSProperties = { margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: 'rgba(228,224,218,0.55)' }
const gold: React.CSSProperties = { background: '#C9A84C', color: '#000', border: 'none', padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { background: 'transparent', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }
const STATUS: Record<string, string> = { unverified: 'Unverified', pending: 'Pending', verified: 'Verified', rejected: 'Rejected', expired: 'Expired' }
const EMPTY: Row = { name: '', slug: '', logo_url: '', description: '', website: '', email: '', phone: '', verification_status: 'unverified', verification_notes: '', active: true, country_ids: [] }

export default function DevelopersAdminPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [countries, setCountries] = useState<Row[]>([])
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/developers')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load developers.')
      setRows(json.data || [])
      setCountries(json.countries || [])
      setUnmatched(json.unmatched || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load developers.')
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function send(method: 'POST' | 'PATCH' | 'DELETE', body: Row | null, query = '') {
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch(`/api/admin/developers${query}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed.')
      const n = json.relinked ? (json.relinked.developments_updated || 0) + (json.relinked.listings_updated || 0) : 0
      setNotice(`Saved.${n ? ` ${n} project${n === 1 ? '' : 's'} relinked.` : ''}`)
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!editing) return
    const { id, created_at, updated_at, verified_at, verified_by, project_count, ...fields } = editing
    const ok = id ? await send('PATCH', { id, ...fields }) : await send('POST', fields)
    if (ok) setEditing(null)
  }

  const set = (patch: Row) => setEditing((e) => ({ ...e, ...patch }))

  function form() {
    if (!editing) return null
    const e = editing
    return (
      <div style={{ ...card, borderColor: 'rgba(201,168,76,0.4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <div><label style={label}>Name</label><input style={input} value={e.name} onChange={(x) => set({ name: x.target.value })} /></div>
          <div><label style={label}>URL slug</label><input style={input} value={e.slug} placeholder="from the name" onChange={(x) => set({ slug: x.target.value })} /></div>
        </div>
        <p style={hint}>The name must match the &ldquo;Developer&rdquo; on its projects in Admin → Developments — that is how projects link. Page address: /developers/<b>{e.slug || 'slug'}</b></p>
        <div style={{ marginTop: 10 }}><label style={label}>Description</label><textarea style={{ ...input, resize: 'vertical' }} rows={4} value={e.description || ''} onChange={(x) => set({ description: x.target.value })} /></div>
        <p style={hint}>Facts only: no unverifiable awards, sales figures or &ldquo;leading developer&rdquo; claims.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
          <div><label style={label}>Website</label><input style={input} value={e.website || ''} onChange={(x) => set({ website: x.target.value })} /></div>
          <div><label style={label}>Email</label><input style={input} value={e.email || ''} onChange={(x) => set({ email: x.target.value })} /></div>
          <div><label style={label}>Phone</label><input style={input} value={e.phone || ''} onChange={(x) => set({ phone: x.target.value })} /></div>
        </div>
        <p style={hint}>Email and phone are for your records — they are not shown on the public site.</p>
        <div style={{ marginTop: 10 }}>
          <label style={label}>Logo</label>
          <input style={input} value={e.logo_url || ''} placeholder="Path from the Media Library (e.g. developers/citi.png) or a full https:// URL" onChange={(x) => set({ logo_url: x.target.value })} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={label}>Countries</label>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {countries.map((c) => (
              <label key={c.id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, opacity: c.active ? 1 : 0.6 }}>
                <input type="checkbox" checked={(e.country_ids || []).includes(c.id)}
                  onChange={(x) => set({ country_ids: x.target.checked ? [...(e.country_ids || []), c.id] : (e.country_ids || []).filter((id: string) => id !== c.id) })} />
                {c.name}{!c.active && ' (hidden market)'}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 12 }}>
          <div>
            <label style={label}>Verification</label>
            <select style={{ ...input, cursor: 'pointer' }} value={e.verification_status} onChange={(x) => set({ verification_status: x.target.value })}>
              {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><label style={label}>Verification notes (internal)</label><input style={input} value={e.verification_notes || ''} placeholder="What was checked, document references…" onChange={(x) => set({ verification_notes: x.target.value })} /></div>
        </div>
        <p style={hint}>A &ldquo;Verified&rdquo; badge shows publicly only for Verified. Only mark a developer verified once CZAAH has actually completed its checks.</p>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 13 }}>
          <input type="checkbox" checked={e.active} onChange={(x) => set({ active: x.target.checked })} /> Shown on the portal
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" style={gold} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" style={ghost} onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 28, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Developers</h1>
      <p style={{ ...hint, fontSize: 13, maxWidth: 700 }}>Developers shown on property.czaah.com/developers, each linked to its projects. One developer can work in several countries.</p>
      {error && <div style={{ ...card, marginTop: 14, borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }}>{error}</div>}
      {notice && <div style={{ ...card, marginTop: 14, borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e' }}>{notice}</div>}

      {unmatched.length > 0 && (
        <div style={{ ...card, marginTop: 14, borderColor: 'rgba(245,158,11,0.45)' }}>
          <strong style={{ fontSize: 13 }}>Projects naming a developer that isn&apos;t set up yet</strong>
          {unmatched.map((n) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13 }}>{n}</span>
              <button type="button" style={ghost} onClick={() => setEditing({ ...EMPTY, name: n })}>Add {n}</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '16px 0 10px' }}>
        <button type="button" style={ghost} onClick={() => setEditing({ ...EMPTY })}>+ Add developer</button>
      </div>
      {editing && !editing.id && form()}

      {!rows && !error && <div>Loading…</div>}
      {rows?.map((d) => (
        <div key={d.id}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{d.name}</strong>
                <span style={{ fontSize: 12, opacity: 0.6 }}>/developers/{d.slug} · {d.project_count} project{d.project_count === 1 ? '' : 's'}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: d.verification_status === 'verified' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', color: d.verification_status === 'verified' ? '#22c55e' : 'rgba(228,224,218,0.7)' }}>
                  {STATUS[d.verification_status]}{d.verified_at ? ` · ${new Date(d.verified_at).toLocaleDateString()}` : ''}
                </span>
                {!d.active && <span style={{ fontSize: 11, opacity: 0.6 }}>Hidden</span>}
              </span>
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button type="button" style={ghost} onClick={() => setEditing({ ...d })}>Edit</button>
                <button type="button" style={{ ...ghost, borderColor: 'rgba(239,68,68,0.45)', color: '#ef4444' }} disabled={busy}
                  onClick={() => window.confirm(`Delete ${d.name}? A developer linked to projects can't be deleted — switch it off instead.`) && send('DELETE', null, `?id=${d.id}`)}>
                  Delete
                </button>
              </span>
            </div>
          </div>
          {editing?.id === d.id && form()}
        </div>
      ))}
    </div>
  )
}
