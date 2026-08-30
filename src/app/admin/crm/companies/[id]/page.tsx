'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'

const STAGES = ['new', 'engaged', 'qualified', 'active', 'dormant', 'lost']
const ORG_TYPES = ['company', 'investor', 'partner_firm', 'government', 'fund', 'counterparty', 'other']
const KYC = ['none', 'pending', 'cleared', 'flagged']

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [co, setCo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'contacts' | 'notes' | 'tasks' | 'files' | 'activity'>('overview')
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const [notes, setNotes] = useState<any[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [tasks, setTasks] = useState<any[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [docs, setDocs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [feed, setFeed] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/companies/${id}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Not found')
      setCo(j.data)
      setDraft({
        name: j.data.name, domain: j.data.domain || '', website: j.data.website || '',
        country: j.data.country || '', companySize: j.data.company_size || '', stage: j.data.stage,
        description: j.data.description || '', orgType: j.data.org_type || 'company',
        registrationNumber: j.data.registration_number || '', regulator: j.data.regulator || '',
        jurisdiction: j.data.jurisdiction || '', kycStatus: j.data.kyc_status || 'none',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [id])

  const loadNotes = useCallback(async () => { const r = await fetch(`/api/crm/notes?type=company&id=${id}`); if (r.ok) setNotes((await r.json()).data) }, [id])
  const loadTasks = useCallback(async () => { const r = await fetch(`/api/crm/tasks?type=company&id=${id}`); if (r.ok) setTasks((await r.json()).data) }, [id])
  const loadDocs = useCallback(async () => { const r = await fetch(`/api/crm/documents?type=company&id=${id}`); if (r.ok) setDocs((await r.json()).data) }, [id])
  const loadFeed = useCallback(async () => { const r = await fetch(`/api/crm/timeline?type=company&id=${id}`); if (r.ok) setFeed((await r.json()).data) }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (tab === 'notes') loadNotes() }, [tab, loadNotes])
  useEffect(() => { if (tab === 'tasks') loadTasks() }, [tab, loadTasks])
  useEffect(() => { if (tab === 'files') loadDocs() }, [tab, loadDocs])
  useEffect(() => { if (tab === 'activity') loadFeed() }, [tab, loadFeed])

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/crm/companies/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Save failed')
      setEdit(false); await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }
  async function addNote() {
    if (!noteBody.trim()) return
    const r = await fetch('/api/crm/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'company', id, body: noteBody }) })
    if (r.ok) { setNoteBody(''); await loadNotes() }
  }
  async function addTask() {
    if (!taskTitle.trim()) return
    const r = await fetch('/api/crm/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: taskTitle, relatedType: 'company', relatedId: id }) })
    if (r.ok) { setTaskTitle(''); await loadTasks() }
  }
  async function toggleTask(tid: string, status: string) {
    await fetch(`/api/crm/tasks?taskId=${tid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await loadTasks()
  }
  async function uploadFile(file: File) {
    setUploading(true); setError(null)
    try {
      const u = await fetch('/api/crm/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'upload-url', type: 'company', id, filename: file.name }) }).then((r) => r.json())
      if (u.error) throw new Error(u.error)
      const put = await fetch(u.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!put.ok) throw new Error('Upload failed')
      const rec = await fetch('/api/crm/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'company', id, path: u.path, filename: u.filename, contentType: file.type, sizeBytes: file.size }) }).then((r) => r.json())
      if (rec.error) throw new Error(rec.error)
      await loadDocs()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally { setUploading(false) }
  }
  async function deleteDoc(docId: string) { await fetch(`/api/crm/documents?docId=${docId}`, { method: 'DELETE' }); await loadDocs() }

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (error && !co) return <div className="text-red-400 py-12 text-center text-sm">{error}</div>
  if (!co) return null

  const field = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm'

  return (
    <div className="max-w-3xl">
      <Link href="/admin/crm/companies" className="text-xs text-primary hover:text-primary/80 transition-colors">← Companies</Link>

      <div className="flex items-start justify-between mt-3 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">{co.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-on-surface-variant/70">
            {co.domain && <span className="font-mono">{co.domain}</span>}
            {co.sector?.name && <><span className="text-on-surface-variant/30">·</span><span>{co.sector.name}</span></>}
            <span className="text-on-surface-variant/30">·</span><span>{co.stage}</span>
          </div>
        </div>
        {!edit && tab === 'overview' && <button onClick={() => setEdit(true)} className="text-xs text-primary border border-outline-variant/30 hover:border-primary/50 px-3 py-1.5 transition-colors">Edit</button>}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 mb-4 text-sm text-red-400">{error}</div>}

      <div className="flex gap-1 border-b border-outline-variant/10 mb-5 overflow-x-auto">
        {(['overview', 'contacts', 'notes', 'tasks', 'files', 'activity'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm capitalize whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            {t}{t === 'contacts' ? ` (${co.contacts?.length || 0})` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-surface-container-low border border-outline-variant/10 p-5">
          {edit ? (
            <div className="space-y-3">
              {[['name', 'Name'], ['domain', 'Domain'], ['website', 'Website'], ['country', 'Country'], ['companySize', 'Size'], ['registrationNumber', 'Registration no.'], ['regulator', 'Regulator'], ['jurisdiction', 'Jurisdiction (ISO2)']].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs text-on-surface-variant mb-1">{label}</label>
                  <input value={draft[k]} onChange={(e) => setDraft((d: any) => ({ ...d, [k]: e.target.value }))} className={field} />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">Type</label>
                  <select value={draft.orgType} onChange={(e) => setDraft((d: any) => ({ ...d, orgType: e.target.value }))} className={field}>
                    {ORG_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">Stage</label>
                  <select value={draft.stage} onChange={(e) => setDraft((d: any) => ({ ...d, stage: e.target.value }))} className={field}>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">KYC</label>
                  <select value={draft.kycStatus} onChange={(e) => setDraft((d: any) => ({ ...d, kycStatus: e.target.value }))} className={field}>
                    {KYC.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Description</label>
                <textarea value={draft.description} onChange={(e) => setDraft((d: any) => ({ ...d, description: e.target.value }))} rows={3} className={`${field} resize-none`} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => { setEdit(false); load() }} className="px-3 py-1.5 text-sm text-on-surface-variant border border-outline-variant/10">Cancel</button>
                <button onClick={save} disabled={saving} className="bg-primary text-on-primary font-semibold px-4 py-1.5 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
              <dt className="text-on-surface-variant/60">Type</dt><dd className="text-on-surface capitalize">{(co.org_type || 'company').replace('_', ' ')}</dd>
              <dt className="text-on-surface-variant/60">Website</dt><dd className="text-on-surface">{co.website || '—'}</dd>
              <dt className="text-on-surface-variant/60">Country</dt><dd className="text-on-surface">{co.country || '—'}</dd>
              <dt className="text-on-surface-variant/60">Jurisdiction</dt><dd className="text-on-surface">{co.jurisdiction || '—'}</dd>
              <dt className="text-on-surface-variant/60">Reg. no.</dt><dd className="text-on-surface">{co.registration_number || '—'}</dd>
              <dt className="text-on-surface-variant/60">Regulator</dt><dd className="text-on-surface">{co.regulator || '—'}</dd>
              <dt className="text-on-surface-variant/60">KYC</dt><dd className="text-on-surface capitalize">{co.kyc_status || 'none'}</dd>
              <dt className="text-on-surface-variant/60">Size</dt><dd className="text-on-surface">{co.company_size || '—'}</dd>
              <dt className="text-on-surface-variant/60">Owner</dt><dd className="text-on-surface">{co.owner?.full_name || '—'}</dd>
              {co.description && <><dt className="text-on-surface-variant/60">About</dt><dd className="text-on-surface whitespace-pre-wrap">{co.description}</dd></>}
            </dl>
          )}
        </div>
      )}

      {tab === 'contacts' && (
        co.contacts?.length ? (
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {co.contacts.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <Link href={`/admin/crm/contacts/${c.id}`} className="text-sm text-on-surface hover:text-primary flex-1 truncate">{c.name}</Link>
                {c.email && <span className="text-on-surface-variant/50 text-xs font-mono truncate">{c.email}</span>}
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wide flex-none">{c.type}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-on-surface-variant/60 text-sm">No contacts linked to this company.</p>
      )}

      {tab === 'notes' && (
        <div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 mb-4">
            <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a note…" rows={3} className={`${field} resize-none`} />
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

      {tab === 'tasks' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTask() }} placeholder="Add a task…" className={`${field} flex-1`} />
            <button onClick={addTask} disabled={!taskTitle.trim()} className="bg-primary text-on-primary font-semibold px-4 py-2 text-sm disabled:opacity-40">Add</button>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {tasks.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No tasks.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                <button onClick={() => toggleTask(t.id, t.status === 'done' ? 'open' : 'done')} className={`mt-0.5 w-4 h-4 flex-none border ${t.status === 'done' ? 'bg-primary border-primary' : 'border-outline-variant/40 hover:border-primary'}`}>
                  {t.status === 'done' && <span className="text-on-primary text-[10px] leading-none block">✓</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${t.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`}>{t.title}</p>
                  <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{t.assignee?.full_name || 'Unassigned'}{t.due_at && ` · due ${new Date(t.due_at).toLocaleDateString()}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'files' && (
        <div>
          <label className="mb-4 flex items-center gap-3 bg-surface-container-low border border-dashed border-outline-variant/30 hover:border-primary/50 transition-colors px-4 py-5 cursor-pointer text-sm text-on-surface-variant">
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} disabled={uploading} />
            {uploading ? 'Uploading…' : '＋ Upload a file for this company'}
          </label>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {docs.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No files.</p>}
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <a href={d.url || '#'} target="_blank" rel="noopener" className="text-sm text-on-surface hover:text-primary truncate block">{d.filename}</a>
                  <p className="text-[11px] text-on-surface-variant/50">{d.sizeBytes ? `${(d.sizeBytes / 1024).toFixed(0)} KB · ` : ''}{d.uploadedBy || 'Unknown'} · {new Date(d.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => deleteDoc(d.id)} className="text-[11px] text-error/60 hover:text-error flex-none">delete</button>
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
