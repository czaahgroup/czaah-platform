'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AiAssist from '@/components/AiAssist'

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
  const [tab, setTab] = useState<'overview' | 'emails' | 'notes' | 'tasks' | 'files' | 'activity'>('overview')
  const [docs, setDocs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [emails, setEmails] = useState<any[]>([])
  const [compose, setCompose] = useState(false)
  const [mailboxes, setMailboxes] = useState<any[]>([])
  const [mail, setMail] = useState({ mailboxId: '', subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [aiIntent, setAiIntent] = useState('')
  const [aiDrafting, setAiDrafting] = useState(false)
  const [aiMsg, setAiMsg] = useState<string | null>(null)
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

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/crm/tasks?type=contact&id=${id}`)
    if (res.ok) setTasks((await res.json()).data)
  }, [id])

  const loadEmails = useCallback(async () => {
    const res = await fetch(`/api/crm/contacts/${id}/emails`)
    if (res.ok) setEmails((await res.json()).data)
  }, [id])

  async function openCompose() {
    setCompose(true)
    if (!mailboxes.length) {
      const res = await fetch('/api/mail/mailboxes')
      if (res.ok) {
        const list = (await res.json()).data || []
        setMailboxes(list)
        if (list[0]) setMail((m) => ({ ...m, mailboxId: list[0].id }))
      }
    }
  }
  async function draftWithAI() {
    if (!aiIntent.trim()) return
    setAiDrafting(true); setAiMsg(null)
    try {
      const res = await fetch('/api/ai/draft-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: id, intent: aiIntent }),
      })
      const j = await res.json()
      if (!res.ok) { setAiMsg(j.error || 'Draft failed'); return }
      if (j.configured === false) { setAiMsg(j.message); return }
      setMail((m) => ({ ...m, subject: j.subject || m.subject, body: j.body || m.body }))
      setAiIntent('')
    } catch {
      setAiMsg('Request failed')
    } finally { setAiDrafting(false) }
  }

  async function sendEmail() {
    if (!c.email || !mail.mailboxId || !mail.subject.trim() || !mail.body.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/mail/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: c.email, subject: mail.subject, body: mail.body, mailboxId: mail.mailboxId }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Send failed')
      setCompose(false)
      setMail((m) => ({ ...m, subject: '', body: '' }))
      await loadEmails()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const loadDocs = useCallback(async () => {
    const res = await fetch(`/api/crm/documents?type=contact&id=${id}`)
    if (res.ok) setDocs((await res.json()).data)
  }, [id])

  useEffect(() => { loadContact() }, [loadContact])
  useEffect(() => { if (tab === 'emails') loadEmails() }, [tab, loadEmails])
  useEffect(() => { if (tab === 'notes') loadNotes() }, [tab, loadNotes])
  useEffect(() => { if (tab === 'tasks') loadTasks() }, [tab, loadTasks])
  useEffect(() => { if (tab === 'files') loadDocs() }, [tab, loadDocs])
  useEffect(() => { if (tab === 'activity') loadFeed() }, [tab, loadFeed])

  async function uploadFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const u = await fetch('/api/crm/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload-url', type: 'contact', id, filename: file.name }),
      }).then((r) => r.json())
      if (u.error) throw new Error(u.error)
      const put = await fetch(u.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!put.ok) throw new Error('Upload failed')
      const rec = await fetch('/api/crm/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contact', id, path: u.path, filename: u.filename, contentType: file.type, sizeBytes: file.size }),
      }).then((r) => r.json())
      if (rec.error) throw new Error(rec.error)
      await loadDocs()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }
  async function deleteDoc(docId: string) {
    await fetch(`/api/crm/documents?docId=${docId}`, { method: 'DELETE' })
    await loadDocs()
  }

  async function addTask() {
    if (!taskTitle.trim()) return
    const res = await fetch('/api/crm/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: taskTitle, dueAt: taskDue || null, relatedType: 'contact', relatedId: id }),
    })
    if (res.ok) { setTaskTitle(''); setTaskDue(''); await loadTasks() }
  }
  async function toggleTask(tid: string, status: string) {
    await fetch(`/api/crm/tasks?taskId=${tid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await loadTasks()
  }

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

      <div className="flex gap-1 border-b border-outline-variant/10 mb-5 overflow-x-auto">
        {(['overview', 'emails', 'notes', 'tasks', 'files', 'activity'] as const).map((t) => (
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
          {!edit && <AiAssist type="contact" id={id} />}
        </div>
      )}

      {tab === 'emails' && (
        <div className="space-y-2">
          {c.email && !compose && (
            <button onClick={openCompose} className="mb-2 text-xs text-primary border border-outline-variant/30 hover:border-primary/50 px-3 py-1.5 transition-colors">
              ✎ Compose email to {c.email}
            </button>
          )}
          {compose && (
            <div className="bg-surface-container-low border border-outline-variant/10 p-4 mb-3 space-y-2">
              <div className="flex gap-2">
                <select value={mail.mailboxId} onChange={(e) => setMail((m) => ({ ...m, mailboxId: e.target.value }))}
                  className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-1.5 text-xs text-on-surface">
                  {mailboxes.map((mb) => <option key={mb.id} value={mb.id}>{mb.address}</option>)}
                </select>
                <span className="text-xs text-on-surface-variant/60 self-center">→ {c.email}</span>
              </div>
              <div className="flex gap-2">
                <input value={aiIntent} onChange={(e) => setAiIntent(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); draftWithAI() } }}
                  placeholder="Tell AI what to say, e.g. follow up on last week's proposal…"
                  className="flex-1 bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm" />
                <button onClick={draftWithAI} disabled={aiDrafting || !aiIntent.trim()}
                  className="px-3 py-2 text-xs text-primary border border-primary/30 hover:bg-primary/10 disabled:opacity-40 flex-none whitespace-nowrap">
                  {aiDrafting ? 'Drafting…' : '✦ Draft with AI'}
                </button>
              </div>
              {aiMsg && <p className="text-[11px] text-on-surface-variant/60">{aiMsg}</p>}
              <input value={mail.subject} onChange={(e) => setMail((m) => ({ ...m, subject: e.target.value }))} placeholder="Subject"
                className="w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm" />
              <textarea value={mail.body} onChange={(e) => setMail((m) => ({ ...m, body: e.target.value }))} rows={5} placeholder="Message…"
                className="w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm resize-none" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCompose(false)} className="px-3 py-1.5 text-xs text-on-surface-variant border border-outline-variant/10">Cancel</button>
                <button onClick={sendEmail} disabled={sending || !mail.mailboxId || !mail.subject.trim() || !mail.body.trim()}
                  className="bg-primary text-on-primary font-semibold px-4 py-1.5 text-xs disabled:opacity-40">{sending ? 'Sending…' : 'Send'}</button>
              </div>
            </div>
          )}
          {emails.length === 0 && !compose && (
            <p className="text-on-surface-variant/60 text-sm text-center py-8">
              No email threads linked. Threads are linked automatically when mail is received from {c.email ? <span className="font-mono">{c.email}</span> : 'this contact'}.
            </p>
          )}
          {emails.map((t) => (
            <a key={t.id} href={`/admin/mail?thread=${t.id}`} className="block bg-surface-container-low border border-outline-variant/10 hover:border-primary/40 transition-colors p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-on-surface font-medium truncate">{t.subject || '(no subject)'}</span>
                <span className="text-[11px] text-on-surface-variant/50 flex-none">{new Date(t.lastAt).toLocaleDateString()}</span>
              </div>
              <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
                {t.messageCount} message{t.messageCount === 1 ? '' : 's'} · {t.mailbox || 'mailbox'}
                {t.lastDirection && ` · last ${t.lastDirection}`}
              </p>
              {t.preview && <p className="text-xs text-on-surface-variant/70 mt-1.5 line-clamp-2">{t.preview}</p>}
            </a>
          ))}
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

      {tab === 'tasks' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
              placeholder="Add a task for this contact…" className="flex-1 bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm" />
            <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm" />
            <button onClick={addTask} disabled={!taskTitle.trim()} className="bg-primary text-on-primary font-semibold px-4 py-2 text-sm disabled:opacity-40">Add</button>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {tasks.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No tasks.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                <button onClick={() => toggleTask(t.id, t.status === 'done' ? 'open' : 'done')}
                  className={`mt-0.5 w-4 h-4 flex-none border ${t.status === 'done' ? 'bg-primary border-primary' : 'border-outline-variant/40 hover:border-primary'}`}>
                  {t.status === 'done' && <span className="text-on-primary text-[10px] leading-none block">✓</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${t.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`}>{t.title}</p>
                  <p className="text-[11px] text-on-surface-variant/50 mt-0.5">
                    {t.assignee?.full_name || 'Unassigned'}{t.due_at && ` · due ${new Date(t.due_at).toLocaleDateString()}`}
                  </p>
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
            {uploading ? 'Uploading…' : '＋ Upload a file for this contact'}
          </label>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {docs.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No files.</p>}
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <a href={d.url || '#'} target="_blank" rel="noopener" className="text-sm text-on-surface hover:text-primary truncate block">{d.filename}</a>
                  <p className="text-[11px] text-on-surface-variant/50">
                    {d.sizeBytes ? `${(d.sizeBytes / 1024).toFixed(0)} KB · ` : ''}{d.uploadedBy || 'Unknown'} · {new Date(d.createdAt).toLocaleDateString()}
                  </p>
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
