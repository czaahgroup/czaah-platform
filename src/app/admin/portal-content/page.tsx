'use client'
// @ts-nocheck

import { useCallback, useEffect, useState } from 'react'

type Row = Record<string, unknown>

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-container-lowest, #0a0a0a)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 0,
  padding: '9px 12px',
  fontSize: '13px',
  color: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  opacity: 0.6,
  marginBottom: '5px',
}

const hintStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontSize: '11.5px',
  lineHeight: 1.5,
  color: 'rgba(228,224,218,0.5)',
}

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'var(--surface-container-low, #111)',
  padding: '18px',
  marginBottom: '14px',
}

const buttonStyle: React.CSSProperties = {
  background: '#C9A84C',
  color: '#000',
  border: 'none',
  padding: '10px 22px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const ghostButton: React.CSSProperties = {
  background: 'transparent',
  color: 'inherit',
  border: '1px solid rgba(255,255,255,0.18)',
  padding: '7px 14px',
  fontSize: '12px',
  cursor: 'pointer',
}

const TABS = [
  { key: 'settings', label: 'Settings' },
  { key: 'home', label: 'Home hero' },
  { key: 'offices', label: 'Offices' },
  { key: 'destinations', label: 'Destinations' },
  { key: 'insights', label: 'Insights' },
  { key: 'whyInvest', label: 'Why invest' },
  { key: 'testimonials', label: 'Testimonials' },
]

// These sections are plain arrays, so they get a shared list editor rather
// than the object-merge path the other sections use.
interface ListField {
  key: string
  label: string
  width: number
  hint?: string
  textarea?: boolean
  options?: string[]
}

const LIST_FIELDS: Record<string, ListField[]> = {
  destinations: [
    { key: 'slug', label: 'Slug', hint: 'The URL: /destinations/london', width: 1 },
    { key: 'city', label: 'City', width: 1 },
    { key: 'country', label: 'Country', width: 1 },
    { key: 'tagline', label: 'Tagline', width: 3 },
    { key: 'blurb', label: 'Blurb', width: 3, textarea: true },
  ],
  insights: [
    { key: 'id', label: 'ID', hint: 'Anchor on the main site, e.g. post-14', width: 1 },
    { key: 'category', label: 'Category', width: 1, options: ['Real Estate', 'Infrastructure'] },
    { key: 'date', label: 'Date', hint: '28 February 2026', width: 1 },
    { key: 'title', label: 'Title', width: 3 },
    { key: 'excerpt', label: 'Excerpt', width: 3, textarea: true },
  ],
  whyInvest: [
    { key: 'market', label: 'Market', hint: 'Reasons with the same market form one tab, in list order', width: 1 },
    { key: 'title', label: 'Title', width: 2 },
    { key: 'body', label: 'Text', width: 3, textarea: true },
  ],
  testimonials: [
    { key: 'author', label: 'Author', hint: 'e.g. Managing Director', width: 1 },
    { key: 'role', label: 'Role', hint: 'e.g. Saudi Family Office', width: 2 },
    { key: 'quote', label: 'Quote', width: 3, textarea: true },
  ],
}

const LIST_NOUN: Record<string, string> = {
  destinations: 'destination(s)',
  insights: 'article(s)',
  whyInvest: 'reason(s)',
  testimonials: 'testimonial(s)',
}

// Shown under each list. Why invest and testimonials carry the claims rules
// agreed in the 2026-09-23 review, so editors see them where they type.
const LIST_HINT: Record<string, string> = {
  destinations:
    'A city with no entry still appears on the portal with its name and a generic label — it just has no editorial copy. Properties are matched to a destination by city automatically.',
  insights:
    'Teasers that deep-link to the full article on the main site. The three most recent also appear on the portal home page. Only quote a figure you can source.',
  whyInvest:
    'The home page "Why invest in …" tabs. Keep it factual: no yield or growth figures, comparisons or guarantees you cannot evidence, and say when tax treatment depends on the buyer’s own country.',
  testimonials:
    'Only add a quote from a real client who agreed to it and that you could evidence if challenged. Nothing that promises returns or protection from risk. While the list is empty the section is hidden.',
}

export default function PortalContentPage() {
  const [content, setContent] = useState<Row | null>(null)
  const [defaults, setDefaults] = useState<Row | null>(null)
  const [customised, setCustomised] = useState<string[]>([])
  const [tab, setTab] = useState('settings')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [videos, setVideos] = useState<Row[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/portal-content')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      setContent(json.data)
      setDefaults(json.defaults)
      setCustomised(json.customised || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load portal content.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Videos already in the media library, offered as hero clips.
  useEffect(() => {
    async function loadVideos() {
      try {
        const res = await fetch('/api/admin/media')
        const json = await res.json()
        if (res.ok) setVideos((json.data || []).filter((f: Row) => f.kind === 'video'))
      } catch {
        // The hero editor still works with manually entered paths.
      }
    }
    loadVideos()
  }, [])

  function edit(section: string, patch: Row) {
    setContent((c) => ({ ...c, [section]: { ...c[section], ...patch } }))
  }

  async function save(section: string) {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/portal-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: section, data: content[section] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      setNotice('Saved. The portal picks this up within a minute.')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function reset(section: string) {
    if (!window.confirm(`Reset ${section} to the values the site shipped with?`)) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/portal-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: section, data: null }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Reset failed')
      setNotice('Reset to default.')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !content) {
    return <div style={{ padding: 28 }}>{error ? <span style={{ color: '#ef4444' }}>{error}</span> : 'Loading…'}</div>
  }

  const settings = content.settings || {}
  const home = content.home || {}
  const offices = content.offices || {}

  return (
    <div style={{ padding: '28px', maxWidth: '1000px' }}>
      <h1 style={{ fontSize: '22px', margin: 0 }}>Portal content</h1>
      <p style={{ ...hintStyle, maxWidth: '660px' }}>
        Settings and copy for property.czaah.com. Anything not set here falls back to the values the
        site shipped with, so a blank field can never produce a blank page.
      </p>

      {error && <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444', marginTop: 16 }}>{error}</div>}
      {notice && <div style={{ ...cardStyle, borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e', marginTop: 16 }}>{notice}</div>}

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', margin: '20px 0 22px' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              background: 'none',
              border: 0,
              borderBottom: `2px solid ${tab === t.key ? '#C9A84C' : 'transparent'}`,
              color: tab === t.key ? '#C9A84C' : 'inherit',
              padding: '10px 16px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {t.label}
            {customised.includes(t.key) && <span style={{ opacity: 0.5, fontSize: '10px' }}> ●</span>}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <div style={cardStyle}>
          {/* Markets moved to Admin → Locations (2026-09-23). The stored list is
              kept as a fallback only, used if the location tables are unreadable. */}
          <label style={labelStyle}>Countries listed on the portal</label>
          <p style={{ ...hintStyle, marginTop: 0 }}>
            Now managed in <a href="/admin/locations" style={{ color: '#C9A84C' }}>Locations</a> — switch a
            country on or off there. (Fallback list, used only if Locations can&apos;t be read:{' '}
            {(settings.countries || []).join(', ') || 'none'}.)
          </p>

          <div style={{ marginTop: 18 }}>
            <label style={labelStyle}>Display currencies</label>
            <input
              value={(settings.currencies || []).join(', ')}
              onChange={(e) => edit('settings', { currencies: e.target.value.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean) })}
              style={inputStyle}
            />
            <p style={hintStyle}>Offered in the currency switcher. Each one needs a rate below.</p>
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={labelStyle}>Exchange rates — units per 1 USD</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
              {(settings.currencies || []).map((ccy: string) => (
                <div key={ccy}>
                  <label style={{ ...labelStyle, opacity: 0.45 }}>{ccy}</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={(settings.fxPerUsd || {})[ccy] ?? ''}
                    onChange={(e) =>
                      edit('settings', { fxPerUsd: { ...(settings.fxPerUsd || {}), [ccy]: Number(e.target.value) } })
                    }
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
            <p style={hintStyle}>
              Approximate rates for cross-market comparison, not live pricing. Converted figures are
              shown with a &ldquo;~&rdquo; on the portal.
            </p>
          </div>

          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={!!settings.acquisitionCostEnabled}
                onChange={(e) => edit('settings', { acquisitionCostEnabled: e.target.checked })}
                style={{ marginTop: '3px' }}
              />
              <span>
                Show acquisition costs on listing pages
                <span style={{ ...hintStyle, display: 'block', margin: '3px 0 0' }}>
                  Per-jurisdiction stamp duty and transfer fees. Switched off because the rates have
                  not been verified by a tax adviser — turning this on publishes tax figures to the
                  public site.
                </span>
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: 22 }}>
            <button type="button" style={buttonStyle} disabled={saving} onClick={() => save('settings')}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            {customised.includes('settings') && (
              <button type="button" style={ghostButton} onClick={() => reset('settings')}>Reset to default</button>
            )}
          </div>
        </div>
      )}

      {tab === 'home' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px' }}>Home hero reel</strong>
            <button
              type="button"
              style={ghostButton}
              onClick={() =>
                edit('home', { heroReel: [...(home.heroReel || []), { key: `clip-${Date.now()}`, label: '', video: '', poster: '' }] })
              }
            >
              + Add clip
            </button>
          </div>
          <p style={hintStyle}>
            Played in order behind the homepage headline. A listing with its own clip takes the first
            three slots ahead of these.
          </p>

          {(home.heroReel || []).map((clip: Row, i: number) => (
            <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '12px', marginTop: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Label</label>
                  <input
                    value={clip.label || ''}
                    onChange={(e) => {
                      const reel = [...home.heroReel]
                      reel[i] = { ...clip, label: e.target.value }
                      edit('home', { heroReel: reel })
                    }}
                    placeholder="Dubai"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Video</label>
                  <select
                    value={clip.video || ''}
                    onChange={(e) => {
                      const reel = [...home.heroReel]
                      reel[i] = { ...clip, video: e.target.value }
                      edit('home', { heroReel: reel })
                    }}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value={clip.video || ''}>{clip.video || 'Choose…'}</option>
                    {videos.map((v) => (
                      <option key={v.path} value={v.url}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginTop: '10px', alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Poster image</label>
                  <input
                    value={clip.poster || ''}
                    onChange={(e) => {
                      const reel = [...home.heroReel]
                      reel[i] = { ...clip, poster: e.target.value }
                      edit('home', { heroReel: reel })
                    }}
                    placeholder="/videos/dubai.jpg"
                    style={inputStyle}
                  />
                </div>
                <button
                  type="button"
                  style={{ ...ghostButton, borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
                  onClick={() => edit('home', { heroReel: home.heroReel.filter((_: Row, j: number) => j !== i) })}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', marginTop: 22 }}>
            <button type="button" style={buttonStyle} disabled={saving} onClick={() => save('home')}>
              {saving ? 'Saving…' : 'Save hero'}
            </button>
            {customised.includes('home') && (
              <button type="button" style={ghostButton} onClick={() => reset('home')}>Reset to default</button>
            )}
          </div>
        </div>
      )}

      {LIST_FIELDS[tab] && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px' }}>
              {(content[tab] || []).length} {LIST_NOUN[tab]}
            </strong>
            <button
              type="button"
              style={ghostButton}
              onClick={() => setContent((c) => ({ ...c, [tab]: [...(c[tab] || []), {}] }))}
            >
              + Add
            </button>
          </div>
          <p style={hintStyle}>{LIST_HINT[tab]}</p>

          {(content[tab] || []).map((item: Row, i: number) => (
            <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '12px', marginTop: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {LIST_FIELDS[tab].map((field) => (
                  <div key={field.key} style={{ gridColumn: `span ${field.width}` }}>
                    <label style={labelStyle}>{field.label}</label>
                    {field.options ? (
                      <select
                        value={item[field.key] || ''}
                        onChange={(e) => {
                          const list = [...content[tab]]
                          list[i] = { ...item, [field.key]: e.target.value }
                          setContent((c) => ({ ...c, [tab]: list }))
                        }}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="">Choose…</option>
                        {field.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : field.textarea ? (
                      <textarea
                        rows={3}
                        value={item[field.key] || ''}
                        onChange={(e) => {
                          const list = [...content[tab]]
                          list[i] = { ...item, [field.key]: e.target.value }
                          setContent((c) => ({ ...c, [tab]: list }))
                        }}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    ) : (
                      <input
                        value={item[field.key] || ''}
                        onChange={(e) => {
                          const list = [...content[tab]]
                          list[i] = { ...item, [field.key]: e.target.value }
                          setContent((c) => ({ ...c, [tab]: list }))
                        }}
                        style={inputStyle}
                      />
                    )}
                    {field.hint && <p style={hintStyle}>{field.hint}</p>}
                  </div>
                ))}
              </div>
              <button
                type="button"
                style={{ ...ghostButton, marginTop: '10px', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
                onClick={() => setContent((c) => ({ ...c, [tab]: c[tab].filter((_: Row, j: number) => j !== i) }))}
              >
                Remove
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', marginTop: 22 }}>
            <button type="button" style={buttonStyle} disabled={saving} onClick={() => save(tab)}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {customised.includes(tab) && (
              <button type="button" style={ghostButton} onClick={() => reset(tab)}>Reset to default</button>
            )}
          </div>
        </div>
      )}

      {tab === 'offices' && (
        <div style={cardStyle}>
          <label style={labelStyle}>Contact email</label>
          <input value={offices.email || ''} onChange={(e) => edit('offices', { email: e.target.value })} style={inputStyle} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div>
              <label style={labelStyle}>Phone (Call button)</label>
              <input value={String((offices as Row).phone || '')} onChange={(e) => edit('offices', { phone: e.target.value })} placeholder="+44 20 1234 5678" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>WhatsApp</label>
              <input value={String((offices as Row).whatsapp || '')} onChange={(e) => edit('offices', { whatsapp: e.target.value })} placeholder="+44 7700 900000" style={inputStyle} />
            </div>
          </div>
          <p style={hintStyle}>
            CZAAH&apos;s own numbers — shown as Call and WhatsApp on every listing. Leave empty to hide those
            buttons. Never enter an owner&apos;s or partner&apos;s number here.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
            <strong style={{ fontSize: '13px' }}>Offices</strong>
            <button
              type="button"
              style={ghostButton}
              onClick={() => edit('offices', { offices: [...(offices.offices || []), { city: '', role: '', lines: [] }] })}
            >
              + Add office
            </button>
          </div>
          <p style={hintStyle}>Shown on the portal&rsquo;s About and Contact pages.</p>

          {(offices.offices || []).map((office: Row, i: number) => (
            <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '12px', marginTop: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>City</label>
                  <input
                    value={office.city || ''}
                    onChange={(e) => {
                      const list = [...offices.offices]
                      list[i] = { ...office, city: e.target.value }
                      edit('offices', { offices: list })
                    }}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Role</label>
                  <input
                    value={office.role || ''}
                    onChange={(e) => {
                      const list = [...offices.offices]
                      list[i] = { ...office, role: e.target.value }
                      edit('offices', { offices: list })
                    }}
                    placeholder="Regional office"
                    style={inputStyle}
                  />
                </div>
                <button
                  type="button"
                  style={{ ...ghostButton, borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
                  onClick={() => edit('offices', { offices: offices.offices.filter((_: Row, j: number) => j !== i) })}
                >
                  Remove
                </button>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label style={labelStyle}>Address — one line per row</label>
                <textarea
                  rows={3}
                  value={(office.lines || []).join('\n')}
                  onChange={(e) => {
                    const list = [...offices.offices]
                    list[i] = { ...office, lines: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) }
                    edit('offices', { offices: list })
                  }}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', marginTop: 22 }}>
            <button type="button" style={buttonStyle} disabled={saving} onClick={() => save('offices')}>
              {saving ? 'Saving…' : 'Save offices'}
            </button>
            {customised.includes('offices') && (
              <button type="button" style={ghostButton} onClick={() => reset('offices')}>Reset to default</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
