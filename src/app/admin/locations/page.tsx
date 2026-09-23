'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

// Admin → Locations. The region → country → city → area hierarchy that
// decides which markets property.czaah.com shows, how the Locations page is
// grouped, and which cities have pages. Listings link to it automatically by
// their country/city text.

type Row = Record<string, any>
interface Data {
  regions: Row[]
  countries: Row[]
  cities: Row[]
  areas: Row[]
  groupCountries: { code: string; name: string; region: string | null; currency: string }[]
  usage: Record<string, number>
  unmatched: { country: string; city: string; listings: number; developments: number; countryKnown: boolean }[]
}
type Kind = 'region' | 'country' | 'city' | 'area'

const card: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'var(--surface-container-low, #111)',
  padding: '16px 18px',
  marginBottom: '14px',
}
const input: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-container-lowest, #0a0a0a)',
  border: '1px solid rgba(255,255,255,0.12)',
  padding: '8px 10px',
  fontSize: '13px',
  color: 'inherit',
}
const label: React.CSSProperties = { display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6, marginBottom: 4 }
const hint: React.CSSProperties = { margin: '4px 0 0', fontSize: '12px', lineHeight: 1.5, color: 'rgba(228,224,218,0.55)' }
const gold: React.CSSProperties = { background: '#C9A84C', color: '#000', border: 'none', padding: '8px 16px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { background: 'transparent', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }
const danger: React.CSSProperties = { ...ghost, borderColor: 'rgba(239,68,68,0.45)', color: '#ef4444' }
const badge = (on: boolean): React.CSSProperties => ({
  fontSize: '11px', padding: '2px 8px', borderRadius: 999,
  background: on ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
  color: on ? '#22c55e' : 'rgba(228,224,218,0.6)',
})

// Editable fields per kind, beyond name / slug / order.
const EXTRA: Record<Kind, { key: string; label: string; textarea?: boolean; hint?: string }[]> = {
  region: [{ key: 'description', label: 'Description', textarea: true, hint: 'Optional. When set, the Locations page shows it under this region with a "register your interest" form — use it for markets CZAAH is expanding into.' }],
  country: [
    { key: 'currency', label: 'Currency', hint: '3-letter code, e.g. GBP' },
    { key: 'tagline', label: 'Tagline' },
    { key: 'description', label: 'Description', textarea: true },
  ],
  city: [
    { key: 'tagline', label: 'Tagline', hint: 'Short line on the city card, e.g. "The mature safe haven".' },
    { key: 'blurb', label: 'Blurb', textarea: true, hint: 'Intro on the city page. Leave empty to keep the current text.' },
  ],
  area: [{ key: 'postcode_prefix', label: 'Postcode prefix', hint: 'Optional, e.g. E14' }],
}

export default function LocationsAdminPage() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ kind: Kind; id: string; draft: Row } | null>(null)
  const [adding, setAdding] = useState<{ kind: Kind; parent: string; draft: Row } | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/locations')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load locations.')
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load locations.')
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function call(method: 'POST' | 'PATCH' | 'DELETE', body: Row | null, query = '') {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/admin/locations${query}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed.')
      const n = json.relinked ? (json.relinked.listings_updated || 0) + (json.relinked.developments_updated || 0) : 0
      setNotice(`Saved.${n ? ` ${n} listing${n === 1 ? '' : 's'} relinked.` : ''} The portal updates within a minute.`)
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const toggle = (kind: Kind, row: Row) => call('PATCH', { kind, id: row.id, data: { active: !row.active } })
  const remove = (kind: Kind, row: Row) => {
    if (!window.confirm(`Delete ${row.name}? Locations that listings use can't be deleted — switch them off instead.`)) return
    call('DELETE', null, `?kind=${kind}&id=${row.id}`)
  }
  const saveEdit = async () => {
    if (!editing) return
    if (await call('PATCH', { kind: editing.kind, id: editing.id, data: editing.draft })) setEditing(null)
  }
  const saveAdd = async () => {
    if (!adding) return
    const parentKey = { region: null, country: 'region_id', city: 'country_id', area: 'city_id' }[adding.kind]
    const payload = { ...adding.draft, ...(parentKey ? { [parentKey]: adding.parent } : {}) }
    if (await call('POST', { kind: adding.kind, data: payload })) setAdding(null)
  }

  const children = useMemo(() => {
    const by = (rows: Row[], key: string) => {
      const m = new Map<string, Row[]>()
      for (const r of [...rows].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name))) {
        m.set(r[key], [...(m.get(r[key]) || []), r])
      }
      return m
    }
    return data
      ? { countries: by(data.countries, 'region_id'), cities: by(data.cities, 'country_id'), areas: by(data.areas, 'city_id') }
      : null
  }, [data])

  if (!data || !children) {
    return <div style={{ padding: 28 }}>{error ? <span style={{ color: '#ef4444' }}>{error}</span> : 'Loading…'}</div>
  }

  const usedCodes = new Set(data.countries.map((c) => c.country_code))
  const regions = [...data.regions].sort((a, b) => a.display_order - b.display_order)

  // Plain render functions, not components: a component declared inside this
  // one would be a new type every render and remount — losing input focus on
  // every keystroke.
  function renderEditForm(kind: Kind) {
    if (!editing || editing.kind !== kind) return null
    const d = editing.draft
    const set = (patch: Row) => setEditing({ ...editing, draft: { ...d, ...patch } })
    return (
      <div style={{ ...card, marginTop: 10, borderColor: 'rgba(201,168,76,0.4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 10 }}>
          <div><label style={label}>Name</label><input style={input} value={d.name ?? ''} onChange={(e) => set({ name: e.target.value })} /></div>
          <div><label style={label}>URL slug</label><input style={input} value={d.slug ?? ''} onChange={(e) => set({ slug: e.target.value })} /></div>
          <div><label style={label}>Order</label><input style={input} type="number" value={d.display_order ?? 0} onChange={(e) => set({ display_order: e.target.value })} /></div>
        </div>
        {kind === 'country' && (
          <p style={hint}>The name must match how listings spell the country (e.g. &ldquo;United Kingdom&rdquo;) — that is how listings are linked.</p>
        )}
        {kind === 'city' && (
          <p style={hint}>The name must match the city text on listings. The slug is the page address: /destinations/<b>{d.slug || 'slug'}</b>.</p>
        )}
        {EXTRA[kind].map((f) => (
          <div key={f.key} style={{ marginTop: 10 }}>
            <label style={label}>{f.label}</label>
            {f.textarea ? (
              <textarea style={{ ...input, resize: 'vertical' }} rows={3} value={d[f.key] ?? ''} onChange={(e) => set({ [f.key]: e.target.value })} />
            ) : (
              <input style={input} value={d[f.key] ?? ''} onChange={(e) => set({ [f.key]: e.target.value })} />
            )}
            {f.hint && <p style={hint}>{f.hint}</p>}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" style={gold} disabled={busy} onClick={saveEdit}>{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" style={ghost} onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </div>
    )
  }

  function renderAddForm(kind: Kind, parent: string) {
    if (!adding || adding.kind !== kind || adding.parent !== parent) return null
    const d = adding.draft
    const set = (patch: Row) => setAdding({ ...adding, draft: { ...d, ...patch } })
    return (
      <div style={{ ...card, marginTop: 10, borderColor: 'rgba(201,168,76,0.4)' }}>
        {kind === 'country' ? (
          <div>
            <label style={label}>Country</label>
            <select style={input} value={d.country_code ?? ''} onChange={(e) => set({ country_code: e.target.value })}>
              <option value="">Choose…</option>
              {data!.groupCountries.filter((g) => !usedCodes.has(g.code)).map((g) => (
                <option key={g.code} value={g.code}>{g.name} ({g.code}, {g.currency})</option>
              ))}
            </select>
            <p style={hint}>New countries start switched off, so nothing appears on the portal until you switch it on.</p>
          </div>
        ) : (
          <div>
            <label style={label}>Name</label>
            <input style={input} autoFocus value={d.name ?? ''} onChange={(e) => set({ name: e.target.value })} placeholder={kind === 'city' ? 'e.g. Manchester' : kind === 'area' ? 'e.g. Dubai Marina' : 'e.g. Europe'} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" style={gold} disabled={busy} onClick={saveAdd}>{busy ? 'Adding…' : 'Add'}</button>
          <button type="button" style={ghost} onClick={() => setAdding(null)}>Cancel</button>
        </div>
      </div>
    )
  }

  const Controls = ({ kind, row }: { kind: Kind; row: Row }) => (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      <button type="button" style={ghost} disabled={busy} onClick={() => toggle(kind, row)}>
        {row.active ? (kind === 'country' ? 'Hide market' : 'Switch off') : (kind === 'country' ? 'Show market' : 'Switch on')}
      </button>
      <button type="button" style={ghost} onClick={() => { setAdding(null); setEditing({ kind, id: row.id, draft: { ...row } }) }}>Edit</button>
      <button type="button" style={danger} disabled={busy} onClick={() => remove(kind, row)}>Delete</button>
    </span>
  )
  const uses = (id: string) => data.usage[id] || 0

  return (
    <div style={{ padding: '28px', maxWidth: '1000px' }}>
      <h1 style={{ fontSize: '22px', margin: 0 }}>Locations</h1>
      <p style={{ ...hint, maxWidth: 700, fontSize: 13 }}>
        Regions, countries, cities and areas for property.czaah.com. A country that is switched off is hidden
        everywhere — listings, search, the sitemap and czaah.com&apos;s real estate page. Listings link to a city
        automatically when its name matches the listing&apos;s city.
      </p>

      {error && <div style={{ ...card, marginTop: 16, borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }}>{error}</div>}
      {notice && <div style={{ ...card, marginTop: 16, borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e' }}>{notice}</div>}

      {data.unmatched.length > 0 && (
        <div style={{ ...card, marginTop: 16, borderColor: 'rgba(245,158,11,0.45)' }}>
          <strong style={{ fontSize: 13 }}>Listings in places not set up here yet</strong>
          <p style={hint}>They still show on the portal, but in &ldquo;More locations&rdquo; and without a city page of their own.</p>
          {data.unmatched.map((u) => {
            const country = data.countries.find((c) => c.name.toLowerCase() === u.country.toLowerCase())
            return (
              <div key={`${u.country}|${u.city}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 13 }}>
                  {u.city || '(no city)'}, {u.country || '(no country)'} — {u.listings} listing{u.listings === 1 ? '' : 's'}
                  {u.developments ? `, ${u.developments} development${u.developments === 1 ? '' : 's'}` : ''}
                </span>
                {country && u.city ? (
                  <button type="button" style={ghost} disabled={busy} onClick={() => call('POST', { kind: 'city', data: { country_id: country.id, name: u.city } })}>
                    Add {u.city} to {country.name}
                  </button>
                ) : (
                  <span style={{ ...hint, margin: 0 }}>Add the country first</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '20px 0 10px' }}>
        <button type="button" style={ghost} onClick={() => { setEditing(null); setAdding({ kind: 'region', parent: '', draft: {} }) }}>+ Add region</button>
      </div>
      {renderAddForm('region', '')}

      {regions.map((region) => (
        <div key={region.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <strong style={{ fontSize: 16 }}>{region.name}</strong>
              <span style={badge(region.active)}>{region.active ? 'On' : 'Off'}</span>
              {region.description && <span style={badge(true)}>Register-interest on</span>}
            </span>
            <Controls kind="region" row={region} />
          </div>
          {editing?.id === region.id && renderEditForm('region')}

          {(children.countries.get(region.id) || []).map((country) => {
            const isOpen = open[country.id] ?? true
            return (
              <div key={country.id} style={{ marginTop: 14, paddingLeft: 14, borderLeft: '2px solid rgba(201,168,76,0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button type="button" style={{ ...ghost, border: 'none', padding: 0 }} onClick={() => setOpen({ ...open, [country.id]: !isOpen })} aria-expanded={isOpen}>
                      {isOpen ? '▾' : '▸'}
                    </button>
                    <strong>{country.name}</strong>
                    <span style={{ opacity: 0.6, fontSize: 12 }}>{country.country_code} · {country.currency}</span>
                    <span style={badge(country.active)}>{country.active ? 'Shown on portal' : 'Hidden'}</span>
                    <span style={{ opacity: 0.6, fontSize: 12 }}>{uses(country.id)} linked</span>
                  </span>
                  <Controls kind="country" row={country} />
                </div>
                {editing?.id === country.id && renderEditForm('country')}

                {isOpen && (
                  <div style={{ marginTop: 8 }}>
                    {(children.cities.get(country.id) || []).map((city) => (
                      <div key={city.id} style={{ padding: '10px 0 10px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>{city.name}</span>
                            <span style={{ opacity: 0.5, fontSize: 12 }}>/destinations/{city.slug}</span>
                            {!city.active && <span style={badge(false)}>Off</span>}
                            <span style={{ opacity: 0.6, fontSize: 12 }}>{uses(city.id)} linked</span>
                          </span>
                          <span style={{ display: 'inline-flex', gap: 6 }}>
                            <button type="button" style={ghost} onClick={() => { setEditing(null); setAdding({ kind: 'area', parent: city.id, draft: {} }) }}>+ Area</button>
                            <Controls kind="city" row={city} />
                          </span>
                        </div>
                        {editing?.id === city.id && renderEditForm('city')}
                        {(children.areas.get(city.id) || []).length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                            {(children.areas.get(city.id) || []).map((area) => (
                              <span key={area.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.12)', padding: '3px 8px', fontSize: 12, opacity: area.active ? 1 : 0.5 }}>
                                {area.name}
                                <span style={{ opacity: 0.5 }}>{uses(area.id)}</span>
                                <button type="button" title={`Edit ${area.name}`} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }} onClick={() => { setAdding(null); setEditing({ kind: 'area', id: area.id, draft: { ...area } }) }}>✎</button>
                                <button type="button" title={`Delete ${area.name}`} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }} onClick={() => remove('area', area)}>×</button>
                              </span>
                            ))}
                          </div>
                        )}
                        {editing?.kind === 'area' && (children.areas.get(city.id) || []).some((a) => a.id === editing.id) && renderEditForm('area')}
                        {renderAddForm('area', city.id)}
                      </div>
                    ))}
                    <div style={{ padding: '8px 0 0 18px' }}>
                      <button type="button" style={ghost} onClick={() => { setEditing(null); setAdding({ kind: 'city', parent: country.id, draft: {} }) }}>+ Add city to {country.name}</button>
                      {renderAddForm('city', country.id)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <div style={{ marginTop: 14 }}>
            <button type="button" style={ghost} onClick={() => { setEditing(null); setAdding({ kind: 'country', parent: region.id, draft: {} }) }}>+ Add country to {region.name}</button>
            {renderAddForm('country', region.id)}
          </div>
        </div>
      ))}
    </div>
  )
}
