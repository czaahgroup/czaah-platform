'use client'
// @ts-nocheck

import { useCallback, useEffect, useState } from 'react'

type Row = Record<string, unknown>

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-container-lowest, #0a0a0a)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 0,
  padding: '8px 11px',
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
  padding: '16px',
  marginBottom: '12px',
}

const ghostButton: React.CSSProperties = {
  background: 'transparent',
  color: 'inherit',
  border: '1px solid rgba(255,255,255,0.18)',
  padding: '7px 14px',
  fontSize: '12px',
  cursor: 'pointer',
}

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(bytes < 1048576 ? 2 : 1)} MB`

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ ...cardStyle, marginBottom: 0, flex: '1 1 150px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: '24px', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={hintStyle}>{sub}</div>}
    </div>
  )
}

const KIND_LABEL: Record<string, string> = {
  video: 'Video',
  image: 'Image',
  document: 'PDF',
  other: 'Other',
}

export default function AdminMediaPage() {
  const [files, setFiles] = useState<Row[]>([])
  const [summary, setSummary] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [kind, setKind] = useState('')
  const [onlyOrphans, setOnlyOrphans] = useState(false)
  const [preview, setPreview] = useState<Row | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/media')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      setFiles(json.data || [])
      setSummary(json.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the media library.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(path: string) {
    if (!window.confirm(`Delete ${path}? This cannot be undone.`)) return
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [path] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      if (json.refused?.length) setError(`${path} is still used by a listing or development — not deleted.`)
      else setNotice('Deleted.')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  async function removeAllOrphans() {
    const orphans = files.filter((f) => !f.usedBy).map((f) => f.path)
    if (!orphans.length) return
    if (!window.confirm(`Delete ${orphans.length} unused file(s)? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: orphans }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      setNotice(`Deleted ${json.deleted} unused file(s).`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  const visible = files.filter((f) => {
    if (kind && f.kind !== kind) return false
    if (onlyOrphans && f.usedBy) return false
    return true
  })

  return (
    <div style={{ padding: '28px', maxWidth: '1180px' }}>
      <h1 style={{ fontSize: '22px', margin: 0 }}>Media library</h1>
      <p style={{ ...hintStyle, maxWidth: '680px' }}>
        Every image, video and brochure uploaded for property.czaah.com, and what each one is used
        by. Files nothing points at can be deleted here — removing a picture in the editor clears
        the record but leaves the file behind.
      </p>

      {error && <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444', marginTop: 16 }}>{error}</div>}
      {notice && <div style={{ ...cardStyle, borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e', marginTop: 16 }}>{notice}</div>}

      {summary && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '20px 0 24px' }}>
          <Stat label="Videos" value={String(summary.videos)} sub={mb(summary.videoBytes as number)} />
          <Stat label="Images" value={String(summary.images)} />
          <Stat label="Brochures" value={String(summary.documents)} />
          <Stat label="Total files" value={String(summary.total)} sub={mb(summary.totalBytes as number)} />
          <Stat
            label="Unused"
            value={String(summary.orphans)}
            sub={summary.orphans ? `${mb(summary.orphanBytes as number)} reclaimable` : 'nothing to clean up'}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">All</option>
            <option value="video">Videos</option>
            <option value="image">Images</option>
            <option value="document">Brochures</option>
          </select>
        </div>
        <label style={{ display: 'flex', gap: '7px', alignItems: 'center', fontSize: '12.5px', cursor: 'pointer', paddingBottom: '8px' }}>
          <input type="checkbox" checked={onlyOrphans} onChange={(e) => setOnlyOrphans(e.target.checked)} />
          Unused only
        </label>
        <button type="button" style={ghostButton} onClick={load}>Refresh</button>
        {summary?.orphans ? (
          <button
            type="button"
            style={{ ...ghostButton, borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
            onClick={removeAllOrphans}
          >
            Delete {summary.orphans} unused
          </button>
        ) : null}
      </div>

      {loading ? (
        <p style={{ opacity: 0.6 }}>Loading…</p>
      ) : visible.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ margin: 0 }}>Nothing matches.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.6 }}>
              <th style={{ padding: '8px 6px' }}>File</th>
              <th style={{ padding: '8px 6px', width: '80px' }}>Type</th>
              <th style={{ padding: '8px 6px', width: '90px' }}>Size</th>
              <th style={{ padding: '8px 6px' }}>Used by</th>
              <th style={{ padding: '8px 6px', width: '150px' }} />
            </tr>
          </thead>
          <tbody>
            {visible.map((f) => (
              <tr key={f.path} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={{ padding: '9px 6px', wordBreak: 'break-all' }}>{f.name}</td>
                <td style={{ padding: '9px 6px' }}>{KIND_LABEL[f.kind] || f.kind}</td>
                <td style={{ padding: '9px 6px', whiteSpace: 'nowrap' }}>{mb(f.size)}</td>
                <td style={{ padding: '9px 6px' }}>
                  {f.usedBy ? (
                    f.usedBy
                  ) : (
                    <span style={{ color: '#eab308' }}>unused</span>
                  )}
                </td>
                <td style={{ padding: '9px 6px', whiteSpace: 'nowrap' }}>
                  <button type="button" style={{ ...ghostButton, padding: '5px 10px' }} onClick={() => setPreview(f)}>
                    View
                  </button>{' '}
                  {!f.usedBy && (
                    <button
                      type="button"
                      style={{ ...ghostButton, padding: '5px 10px', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
                      onClick={() => remove(f.path)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: '30px',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%' }}>
            {preview.kind === 'video' ? (
              <video src={preview.url} controls autoPlay style={{ width: '100%', maxHeight: '75vh', background: '#000' }} />
            ) : preview.kind === 'document' ? (
              <iframe src={preview.url} style={{ width: '100%', height: '75vh', border: 0, background: '#fff' }} title={preview.name} />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview.url} alt={preview.name} style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain' }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '12px' }}>
              <span style={{ fontSize: '12.5px', wordBreak: 'break-all' }}>
                {preview.name} · {mb(preview.size)} · {preview.usedBy || 'unused'}
              </span>
              <button type="button" style={ghostButton} onClick={() => setPreview(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
