'use client'
// @ts-nocheck

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Executable / script types every mail provider (Resend, Gmail, Outlook) rejects.
const BLOCKED_EXT = new Set([
  'exe', 'bat', 'cmd', 'com', 'scr', 'pif', 'msi', 'msp', 'dll', 'sys', 'cpl', 'hta',
  'vbs', 'vbe', 'js', 'jse', 'jar', 'ws', 'wsf', 'wsc', 'wsh', 'ps1', 'psm1', 'reg',
  'inf', 'lnk', 'chm', 'app', 'gadget', 'msc', 'sh', 'run', 'bin', 'apk', 'dmg',
])
const MAX_TOTAL = 20 * 1024 * 1024

export interface PendingFile {
  path: string
  filename: string
  contentType: string
  size: number
  uploading?: boolean
  failed?: boolean
}

function humanSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export default function AttachmentPicker({
  files,
  setFiles,
  mailboxId,
  compact,
}: {
  files: PendingFile[]
  setFiles: (updater: PendingFile[] | ((prev: PendingFile[]) => PendingFile[])) => void
  mailboxId?: string
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const supabase = createClient()

  async function uploadOne(file: File) {
    const key = { path: '', filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size, uploading: true }
    setFiles((prev) => [...prev, key])
    try {
      const res = await fetch('/api/mail/attachments/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mailboxId }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'upload URL failed')

      const { error: upErr } = await supabase.storage
        .from('mailbox-attachments')
        .uploadToSignedUrl(j.path, j.token, file, { contentType: file.type || 'application/octet-stream' })
      if (upErr) throw upErr

      setFiles((prev) => prev.map((f) => (f === key ? { path: j.path, filename: j.filename || file.name, contentType: key.contentType, size: file.size } : f)))
    } catch (e: any) {
      setFiles((prev) => prev.map((f) => (f === key ? { ...f, uploading: false, failed: true } : f)))
      setWarning(`Couldn't upload ${file.name}: ${e?.message || 'error'}`)
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || [])
    if (inputRef.current) inputRef.current.value = ''
    setWarning(null)

    const rejected: string[] = []
    let total = files.reduce((s, f) => s + f.size, 0)
    for (const f of picked) {
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      if (BLOCKED_EXT.has(ext)) { rejected.push(f.name); continue }
      if (total + f.size > MAX_TOTAL) { rejected.push(`${f.name} (over 20 MB total)`); continue }
      total += f.size
      uploadOne(f)
    }
    if (rejected.length) {
      setWarning(`Can't attach ${rejected.join(', ')}. Email providers block executables and scripts — zip the file or share a link instead.`)
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
      <input ref={inputRef} type="file" multiple hidden onChange={onPick} />
      {warning && (
        <div style={{ flexBasis: '100%', fontSize: '11px', color: 'var(--mail-danger)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span>{warning}</span>
          <button type="button" onClick={() => setWarning(null)} style={{ background: 'none', border: 'none', color: 'var(--mail-text-dim)', cursor: 'pointer' }}>×</button>
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Attach files"
        style={{
          background: 'transparent', border: '1px solid var(--mail-border)', color: 'var(--mail-text-dim)',
          borderRadius: '6px', padding: compact ? '5px 9px' : '7px 11px', fontSize: '12px', cursor: 'pointer',
          fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '5px',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
        Attach
      </button>
      {files.map((f, i) => (
        <span
          key={i}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--mail-chip)', border: `1px solid ${f.failed ? 'var(--mail-danger)' : 'var(--mail-border)'}`,
            borderRadius: '6px', padding: '4px 8px', fontSize: '11px',
            color: f.failed ? 'var(--mail-danger)' : 'var(--mail-text)', opacity: f.uploading ? 0.55 : 1,
          }}
        >
          {f.uploading ? '⏳ ' : ''}{f.filename} <span style={{ color: 'var(--mail-text-faint)' }}>{humanSize(f.size)}</span>
          <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
            style={{ background: 'none', border: 'none', color: 'var(--mail-text-dim)', cursor: 'pointer', fontSize: '13px', lineHeight: 1, padding: 0 }}>×</button>
        </span>
      ))}
    </div>
  )
}
