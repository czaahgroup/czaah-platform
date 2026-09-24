'use client'

import { useRef, useState } from 'react'

/**
 * Photo and video pickers for the admin property form.
 *
 * The form used to take a comma-separated list of image paths, which meant a
 * photo had to be put into storage some other way first — so almost every
 * listing went live with one picture. Files now go straight from the browser
 * to storage through a signed URL (same route the Developments editor uses),
 * and the form keeps storing the resulting paths in its comma string, so the
 * save API is unchanged.
 */

// Phone photos are 4–12MB. Anything wider than this is wasted on the portal.
const MAX_EDGE = 2400
const COMPRESS_OVER_BYTES = 1.5 * 1024 * 1024

export function splitPaths(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

export function publicUrl(value: string): string {
  if (!value) return ''
  if (value.startsWith('http') || value.startsWith('/')) return value
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${value}`
}

/** Shrinks a large JPEG/PNG/WebP to MAX_EDGE; returns the original if that doesn't help. */
async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < COMPRESS_OVER_BYTES) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

const ADMIN_ENDPOINT = '/api/admin/media/upload-url'

async function uploadToStorage(file: File, folder: string, endpoint = ADMIN_ENDPOINT): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      area: 'properties',
      folder,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || `Could not start the upload (${res.status})`)

  const put = await fetch(json.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': json.contentType || file.type || 'application/octet-stream', 'x-upsert': 'true' },
    body: file,
  })
  if (!put.ok) {
    const detail = await put.text().catch(() => '')
    if (put.status === 413 || detail.includes('EntityTooLarge')) {
      throw new Error(`${file.name} is ${(file.size / 1048576).toFixed(0)}MB and storage refused it — compress it and try again.`)
    }
    throw new Error(`${file.name} failed to upload (${put.status}).`)
  }
  return json.path as string
}

function folderFor(title: string): string {
  return title ? title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'new' : 'new'
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: '11px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(0,0,0,0.55)',
  color: '#fff',
  cursor: 'pointer',
  minWidth: 32,
  minHeight: 32,
}

interface PhotoUploaderProps {
  value: string
  title: string
  onChange: (value: string) => void
  onBusyChange: (busy: boolean) => void
  /** Signed-URL route to use; partners have their own. */
  endpoint?: string
  /** Hard cap on photos; extra picks are dropped with a message. */
  maxPhotos?: number
  /** Hide the "paste image links" escape hatch (partners can't reference arbitrary files). */
  allowLinks?: boolean
}

export function PhotoUploader({
  value,
  title,
  onChange,
  onBusyChange,
  endpoint = ADMIN_ENDPOINT,
  maxPhotos,
  allowLinks = true,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [showPaths, setShowPaths] = useState(false)
  const photos = splitPaths(value)

  async function addFiles(list: FileList | File[] | null) {
    let files = Array.from(list || []).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif)$/i.test(f.name))
    if (!files.length) return
    setError(null)
    let note: string | null = null
    if (maxPhotos) {
      const room = Math.max(0, maxPhotos - splitPaths(valueRef.current).length)
      if (files.length > room) note = `Up to ${maxPhotos} photos — ${files.length - room} not added.`
      files = files.slice(0, room)
      if (!files.length) { setError(note); return }
    }
    onBusyChange(true)
    setProgress({ done: 0, total: files.length })
    const added: string[] = []
    const failed: string[] = []
    // Three at a time: fast on wifi without starving a phone connection.
    let next = 0
    const worker = async () => {
      while (next < files.length) {
        const file = files[next++]
        try {
          added.push(await uploadToStorage(await compressImage(file), folderFor(title), endpoint))
        } catch (err) {
          failed.push(err instanceof Error ? err.message : file.name)
        }
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p))
      }
    }
    await Promise.all([worker(), worker(), worker()])
    // Read the latest value at the end, so photos removed mid-upload stay removed.
    onChange([...splitPaths(valueRef.current), ...added].join(', '))
    if (failed.length || note) setError([note, ...failed].filter(Boolean).join(' '))
    setProgress(null)
    onBusyChange(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Keeps addFiles' final write from overwriting edits made while it ran.
  const valueRef = useRef(value)
  valueRef.current = value

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length) return
    const next = [...photos]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next.join(', '))
  }

  function remove(index: number) {
    onChange(photos.filter((_, i) => i !== index).join(', '))
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        onClick={() => !progress && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
        style={{
          border: `1px dashed ${dragging ? '#c9a84c' : 'rgba(255,255,255,0.2)'}`,
          background: dragging ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
          padding: '22px 16px',
          textAlign: 'center',
          cursor: progress ? 'progress' : 'pointer',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {progress ? `Uploading ${progress.done} of ${progress.total}…` : '+ Add photos'}
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
          {progress ? 'You can keep filling in the form.' : 'Tap to choose from your phone or computer, or drag photos here. Pick as many as you like.'}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />

      {error && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#f87171' }}>{error}</p>}

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 10 }}>
          {photos.map((p, i) => (
            <div key={`${p}-${i}`} style={{ position: 'relative', aspectRatio: '4 / 3', background: '#111', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrl(p)} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {i === 0 && (
                <span style={{ position: 'absolute', top: 4, left: 4, background: '#c9a84c', color: '#000', fontSize: 10, fontWeight: 700, padding: '2px 6px', letterSpacing: '0.5px' }}>
                  COVER
                </span>
              )}
              <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, display: 'flex', gap: 4, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" style={buttonStyle} onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move photo ${i + 1} left`}>←</button>
                  <button type="button" style={buttonStyle} onClick={() => move(i, i + 1)} disabled={i === photos.length - 1} aria-label={`Move photo ${i + 1} right`}>→</button>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {i !== 0 && (
                    <button type="button" style={buttonStyle} onClick={() => move(i, 0)} aria-label={`Make photo ${i + 1} the cover`} title="Make cover">★</button>
                  )}
                  <button type="button" style={buttonStyle} onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'rgba(228,224,218,0.5)' }}>
        The cover photo is what appears on cards and the home page. Use ★ to change it, ← → to reorder.
        {maxPhotos ? ` Up to ${maxPhotos} photos.` : ''}{' '}
        {allowLinks && (
          <button type="button" onClick={() => setShowPaths((s) => !s)} style={{ background: 'none', border: 0, padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>
            {showPaths ? 'Hide image links' : 'Paste image links instead'}
          </button>
        )}
      </p>
      {allowLinks && showPaths && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… , https://…"
          style={{ width: '100%', marginTop: 6, background: 'var(--surface-container-lowest, #0a0a0a)', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 12px', fontSize: 13, color: 'inherit' }}
        />
      )}
    </div>
  )
}

interface SingleFileProps {
  value: string
  title: string
  accept: string
  label: string
  onChange: (value: string) => void
  onBusyChange: (busy: boolean) => void
}

/** One-file upload (video, poster) with the URL still editable underneath. */
export function SingleFileUpload({ value, title, accept, label, onChange, onBusyChange }: SingleFileProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError(null)
    setBusy(true)
    onBusyChange(true)
    try {
      const prepared = file.type.startsWith('image/') ? await compressImage(file) : file
      onChange(await uploadToStorage(prepared, folderFor(title)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
      onBusyChange(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{ padding: '9px 14px', fontSize: 13, border: '1px solid rgba(201,168,76,0.5)', background: 'transparent', color: '#c9a84c', cursor: busy ? 'progress' : 'pointer', whiteSpace: 'nowrap' }}
        >
          {busy ? 'Uploading…' : label}
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="or paste a link"
          style={{ flex: 1, minWidth: 0, background: 'var(--surface-container-lowest, #0a0a0a)', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 12px', fontSize: 13, color: 'inherit' }}
        />
        {value && (
          <button type="button" onClick={() => onChange('')} aria-label="Clear" style={{ ...buttonStyle, background: 'transparent' }}>✕</button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => pick(e.target.files)} />
      {error && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f87171' }}>{error}</p>}
    </div>
  )
}

const COMMON_FEATURES = [
  'Parking', 'Garden', 'Balcony', 'Terrace', 'Swimming pool', 'Gym', 'Concierge', 'Security',
  'Lift', 'Air conditioning', 'Sea view', 'City view', 'Furnished', 'Near schools', 'Near metro',
  'Gated community', 'Backup power', 'Servant quarters',
]

/** One-tap chips that add/remove common features in the comma-separated field. */
export function FeatureChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const current = splitPaths(value)
  const has = (f: string) => current.some((c) => c.toLowerCase() === f.toLowerCase())
  function toggle(f: string) {
    onChange((has(f) ? current.filter((c) => c.toLowerCase() !== f.toLowerCase()) : [...current, f]).join(', '))
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {COMMON_FEATURES.map((f) => {
        const on = has(f)
        return (
          <button
            key={f}
            type="button"
            onClick={() => toggle(f)}
            aria-pressed={on}
            style={{
              padding: '6px 10px',
              fontSize: 12,
              minHeight: 32,
              border: `1px solid ${on ? '#c9a84c' : 'rgba(255,255,255,0.15)'}`,
              background: on ? 'rgba(201,168,76,0.15)' : 'transparent',
              color: on ? '#e8c97a' : 'inherit',
              cursor: 'pointer',
            }}
          >
            {on ? '✓ ' : '+ '}{f}
          </button>
        )
      })}
    </div>
  )
}
