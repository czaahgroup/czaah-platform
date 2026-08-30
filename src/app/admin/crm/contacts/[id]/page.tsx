'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const TYPES = ['lead', 'prospect', 'client', 'partner', 'vendor', 'other']
const STAGES = ['new', 'engaged', 'qualified', 'active', 'dormant', 'lost']

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [c, setC] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'notes' | 'activity'>('overview')
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const [notes, setNotes] = useState<any[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [feed, setFeed] = useState<any[]>([])

  const loadContact = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/contacts/${id}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Not found')
      setC(j.data)
      setDraft({
        name: j.data.name, email: j.data.email || '', phone: j.data.phone || '',
        title: j.data.title || '', type: j.data.type, stage: j.data.stage,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadNotes = useCallback(async () => {
    const res = await fetch(`/api/crm/notes?type=contact&id=${id}`)
    if (res.ok) setNotes((await res.json()).data)
  }, [id])

  const loadFeed = useCallback(async () => {
    const res = await fetch(`/api/crm/timeline?type=contact&id=${id}`)
    if (res.ok) setFeed((await res.json()).data)
  }, [id])

  useEffect(() => { loadContact() }, [loadContact])
  useEffect(() => { if (tab === 'notes') loadNotes() }, [tab, loadNotes])
  useEffect(() => { if (tab === 'activity') loadFeed() }, [tab, loadFeed])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/crm/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Save failed')
      setEdit(false)
      await loadContact()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function addNote() {
    if (!noteBody.trim()) return
    const res = await fetch('/api/crm/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'contact', id, body: noteBody }),
    })
    if (res.ok) { setNoteBody(''); await loadNotes() }
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (error && !c) return <div className="text-red-400 py-12 text-center text-sm">{error}</div>
  if (!c) return null

  const field = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm'

  return (
    <div className="max-w-3xl">
      <Link href="/admin/crm/contacts" className="text-xs text-primary hover:text-primary/80 transition-colors">← Contacts</Link>

      <div className="flex items-start justify-between mt-3 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">{c.name}</h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="uppercase tracking-wide bg-primary/15 text-primary px-2 py-0.5">{c.type}</span>
            <span className="text-on-surface-variant/60">{c.stage}</span>
            {c.company?.name && <><span className="text-on-surface-variant/30">·</span><Link href={`/admin/crm/companies/${c.company.id}`} className="text-on-surface-variant hover:text-primary">{c.company.name}</Link></>}
          </div>
        </div>
        {!edit && <button onClick={() => setEdit(true)} className="text-xs text-primary border border-outline-variant/30 hover:border-primary/50 px-3 py-1.5 transition-colors">Edit</button>}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 mb-4 text-sm text-red-400">{error}</div>}

      <div className="flex gap-1 border-b border-outline-variant/10 mb-5">
        {(['overview', 'notes', 'activity'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm capitalize border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-surface-container-low border border-outline-variant/10 p-5">
          {edit ? (
            <div className="space-y-3">
              {[['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['title', 'Title']].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs text-on-surface-variant mb-1">{label}</label>
                  <input value={draft[k]} onChange={(e) => setDraft((d: any) => ({ ...d, [k]: e.target.value }))} className={field} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">Type</label>
                  <select value={draft.type} onChange={(e) => setDraft((d: any) => ({ ...d, type: e.target.value }))} className={field}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">Stage</label>
                  <select value={draft.stage} onChange={(e) => setDraft((d: any) => ({ ...d, stage: e.target.value }))} className={field}>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => { setEdit(false); loadContact() }} className="px-3 py-1.5 text-sm text-on-surface-variant border border-outline-variant/10">Cancel</button>
                <button onClick={save} disabled={saving} className="bg-primary text-on-primary font-semibold px-4 py-1.5 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
              <dt className="text-on-surface-variant/60">Email</dt><dd className="text-on-surface font-mono text-xs">{c.email || '—'}</dd>
              <dt className="text-on-surface-variant/60">Phone</dt><dd className="text-on-surface">{c.phone || '—'}</dd>
              <dt className="text-on-surface-variant/60">Title</dt><dd className="text-on-surface">{c.title || '—'}</dd>
              <dt className="text-on-surface-variant/60">Owner</dt><dd className="text-on-surface">{c.owner?.full_name || '—'}</dd>
              <dt className="text-on-surface-variant/60">Source</dt><dd className="text-on-surface-variant">{c.source || '—'}</dd>
              <dt className="text-on-surface-variant/60">Added</dt><dd className="text-on-surface-variant">{new Date(c.created_at).toLocaleDateString()}</dd>
              {c.profile_id && <><dt className="text-on-surface-variant/60">Platform user</dt><dd><Link href={`/admin/users/${c.profile_id}`} className="text-primary text-xs">View account →</Link></dd></>}
            </dl>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 mb-4">
            <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a note…" rows={3}
              className="w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm resize-none" />
            <div className="flex justify-end mt-2">
              <button onClick={addNote} disabled={!noteBody.trim()} className="bg-primary text-on-primary font-semibold px-4 py-1.5 text-sm disabled:opacity-40">Add note</button>
            </div>
          </div>
          <div className="space-y-2">
            {notes.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="bg-surface-container-low border border-outline-variant/10 p-4">
                <p className="text-sm text-on-surface whitespace-pre-wrap">{n.body}</p>
                <p className="text-[11px] text-on-surface-variant/50 mt-2">{n.author?.full_name} · {timeAgo(n.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-1">
          {feed.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No activity yet.</p>}
          {feed.map((e) => (
            <div key={`${e.kind}-${e.id}`} className="flex gap-3 py-2.5 border-b border-outline-variant/5 last:border-0">
              <span className="text-[10px] uppercase tracking-wide text-on-surface-variant/40 w-16 flex-none pt-0.5">{e.kind}</span>
              <div className="min-w-0 flex-1 text-sm">
                {e.kind === 'event' && <span className="text-on-surface-variant">{e.actor} · <span className="text-on-surface">{e.action.replace(/\./g, ' ')}</span></span>}
                {e.kind === 'note' && <span className="text-on-surface-variant">Note by {e.author}: <span className="text-on-surface">{e.body.slice(0, 140)}</span></span>}
                {e.kind === 'task' && <span className="text-on-surface-variant">Task <span className="text-on-surface">{e.title}</span> ({e.status})</span>}
                {e.kind === 'thread' && <span className="text-on-surface-variant">Email: <span className="text-on-surface">{e.subject}</span></span>}
              </div>
              <span className="text-[11px] text-on-surface-variant/40 flex-none pt-0.5">{timeAgo(e.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
