'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { HOME_SECTIONS, type HomeSectionSetting } from '@/lib/homeLayout'

// Admin → Homepage: the property.czaah.com home page. Order and show/hide the
// sections under the hero, and choose featured listings and developments.
// Changes are live on the next page load.

type Row = Record<string, any>
const card: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface-container-low, #111)', padding: '16px 18px', marginBottom: 16 }
const ghost: React.CSSProperties = { background: 'transparent', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }
const gold: React.CSSProperties = { background: '#C9A84C', color: '#000', border: 'none', padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const hint: React.CSSProperties = { fontSize: 12, opacity: 0.55 }
const META = Object.fromEntries(HOME_SECTIONS.map((s) => [s.key, s]))
const PUBLIC_IMG = (p?: string) => (!p ? null : /^https?:\/\//.test(p) ? p : null)

export default function HomepageAdmin() {
  const [layout, setLayout] = useState<HomeSectionSetting[] | null>(null)
  const [saved, setSaved] = useState<string>('')
  const [listings, setListings] = useState<Row[]>([])
  const [developments, setDevelopments] = useState<Row[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [onlyFeatured, setOnlyFeatured] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/homepage')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load.')
      setLayout(json.layout)
      setSaved(JSON.stringify(json.layout))
      setListings(json.listings || [])
      setDevelopments(json.developments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load.')
    }
  }, [])
  useEffect(() => { load() }, [load])

  const dirty = layout && JSON.stringify(layout) !== saved

  function move(i: number, d: -1 | 1) {
    setLayout((l) => {
      if (!l) return l
      const j = i + d
      if (j < 0 || j >= l.length) return l
      const next = [...l]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function saveLayout() {
    if (!layout) return
    setBusy('layout'); setError(null); setNotice(null)
    try {
      const res = await fetch('/api/admin/homepage', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections: layout }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed.')
      setSaved(JSON.stringify(json.layout))
      setLayout(json.layout)
      setNotice('Home page layout saved — live now.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setBusy(null)
    }
  }

  async function feature(target: 'listing' | 'development', id: string, featured: boolean) {
    setBusy(id); setError(null)
    const set = target === 'listing' ? setListings : setDevelopments
    set((rows) => rows.map((r) => (r.id === id ? { ...r, featured } : r)))
    try {
      const res = await fetch('/api/admin/homepage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, id, featured }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed.')
    } catch (err) {
      set((rows) => rows.map((r) => (r.id === id ? { ...r, featured: !featured } : r)))
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setBusy(null)
    }
  }

  const shownListings = onlyFeatured ? listings.filter((l) => l.featured) : listings
  const featuredCount = listings.filter((l) => l.featured).length

  return (
    <div style={{ padding: 28, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Homepage</h1>
      <p style={{ ...hint, fontSize: 13, maxWidth: 720, lineHeight: 1.6 }}>
        The property.czaah.com home page. The hero video is edited in <Link href="/admin/portal-content" style={{ color: '#C9A84C' }}>Portal Content</Link>;
        the order of the market cards follows <Link href="/admin/locations" style={{ color: '#C9A84C' }}>Locations</Link>.{' '}
        <a href="https://property.czaah.com" target="_blank" rel="noreferrer" style={{ color: '#C9A84C' }}>Open the home page ↗</a>
      </p>
      {error && <div style={{ ...card, borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }}>{error}</div>}
      {notice && <div style={{ ...card, borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e' }}>{notice}</div>}

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>Sections, top to bottom (under the hero)</strong>
          <span style={{ display: 'flex', gap: 8 }}>
            {dirty && <button type="button" style={ghost} onClick={() => setLayout(JSON.parse(saved))}>Undo changes</button>}
            <button type="button" style={{ ...gold, opacity: dirty ? 1 : 0.5 }} disabled={!dirty || busy === 'layout'} onClick={saveLayout}>{busy === 'layout' ? 'Saving…' : 'Save layout'}</button>
          </span>
        </div>
        {!layout && !error && <div>Loading…</div>}
        {layout?.map((s, i) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)', opacity: s.visible ? 1 : 0.5 }}>
            <span style={{ width: 22, fontSize: 12, opacity: 0.5, textAlign: 'right' }}>{i + 1}</span>
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <button type="button" style={ghost} aria-label={`Move ${META[s.key].label} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" style={ghost} aria-label={`Move ${META[s.key].label} down`} disabled={i === layout.length - 1} onClick={() => move(i, 1)}>↓</button>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13.5 }}>{META[s.key].label}</span>
              {META[s.key].hint && <span style={{ ...hint, marginLeft: 8 }}>{META[s.key].hint}</span>}
            </span>
            <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12.5 }}>
              <input type="checkbox" checked={s.visible} onChange={(e) => setLayout((l) => l!.map((x) => (x.key === s.key ? { ...x, visible: e.target.checked } : x)))} />
              Shown
            </label>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <strong style={{ fontSize: 14 }}>Featured listings <span style={hint}>({featuredCount} featured)</span></strong>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12.5 }}>
            <input type="checkbox" checked={onlyFeatured} onChange={(e) => setOnlyFeatured(e.target.checked)} /> Only show featured
          </label>
        </div>
        <p style={{ ...hint, margin: '0 0 8px' }}>Featured listings come first in the home page&apos;s Featured listings section. Saved as soon as you tick.</p>
        {shownListings.map((l) => (
          <label key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!l.featured} disabled={busy === l.id} onChange={(e) => feature('listing', l.id, e.target.checked)} />
            {PUBLIC_IMG(l.images?.[0]) ? <img src={PUBLIC_IMG(l.images[0])!} alt="" style={{ width: 44, height: 30, objectFit: 'cover' }} /> : <span style={{ width: 44 }} />}
            <span style={{ flex: 1, minWidth: 0 }}>{l.title}</span>
            <span style={hint}>{[l.city, l.country].filter(Boolean).join(', ')} · {l.listing_type}</span>
          </label>
        ))}
        {listings.length === 0 && layout && <div style={hint}>No approved listings.</div>}
      </div>

      <div style={card}>
        <strong style={{ fontSize: 14 }}>Featured developments</strong>
        <p style={{ ...hint, margin: '4px 0 8px' }}>Featured developments come first in &ldquo;New &amp; off-plan projects&rdquo;.</p>
        {developments.map((d) => (
          <label key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!d.featured} disabled={busy === d.id} onChange={(e) => feature('development', d.id, e.target.checked)} />
            <span style={{ flex: 1 }}>{d.name}</span>
            <span style={hint}>{[d.city, d.country].filter(Boolean).join(', ')}</span>
          </label>
        ))}
        {developments.length === 0 && layout && <div style={hint}>No published developments.</div>}
      </div>
    </div>
  )
}
