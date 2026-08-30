'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AiBriefing from '@/components/AiBriefing'

const TYPES = ['residential', 'commercial', 'industrial', 'infrastructure', 'mixed_use', 'fit_out', 'other']
const TYPE_LABEL: Record<string, string> = {
  residential: 'Residential', commercial: 'Commercial', industrial: 'Industrial',
  infrastructure: 'Infrastructure', mixed_use: 'Mixed use', fit_out: 'Fit-out', other: 'Other',
}
const STATUS = ['planning', 'tendering', 'awarded', 'in_progress', 'on_hold', 'completed', 'handover', 'cancelled']
const STATUS_LABEL: Record<string, string> = {
  planning: 'Planning', tendering: 'Tendering', awarded: 'Awarded', in_progress: 'In progress',
  on_hold: 'On hold', completed: 'Completed', handover: 'Handover', cancelled: 'Cancelled',
}
const MS_STATUS = ['pending', 'in_progress', 'done', 'blocked', 'skipped']

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [p, setP] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'milestones' | 'updates' | 'files' | 'activity'>('overview')
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [ref, setRef] = useState<any>({ countries: [], currencies: [] })

  const [msName, setMsName] = useState('')
  const [msWeight, setMsWeight] = useState('1')
  const [msDate, setMsDate] = useState('')

  const [upHeadline, setUpHeadline] = useState('')
  const [upBody, setUpBody] = useState('')
  const [upPct, setUpPct] = useState('')

  const [docs, setDocs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [feed, setFeed] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/construction/projects/${id}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Not found')
      setP(j.data)
      setDraft({
        name: j.data.name, projectType: j.data.project_type, status: j.data.status,
        siteLocation: j.data.site_location || '', country: j.data.country || '',
        contractValue: j.data.contract_value ?? '', budget: j.data.budget ?? '', currency: j.data.currency || '',
        progressPct: j.data.progress_pct, startDate: j.data.start_date || '',
        targetCompletion: j.data.target_completion || '', actualCompletion: j.data.actual_completion || '',
        description: j.data.description || '',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [id])

  const loadDocs = useCallback(async () => { const r = await fetch(`/api/crm/documents?type=construction_project&id=${id}`); if (r.ok) setDocs((await r.json()).data) }, [id])
  const loadFeed = useCallback(async () => { const r = await fetch(`/api/crm/timeline?type=construction_project&id=${id}`); if (r.ok) setFeed((await r.json()).data) }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/reference').then((r) => r.ok && r.json()).then((j) => j && setRef({ countries: j.countries || [], currencies: j.currencies || [] }))
  }, [])
  useEffect(() => { if (tab === 'files') loadDocs() }, [tab, loadDocs])
  useEffect(() => { if (tab === 'activity') loadFeed() }, [tab, loadFeed])

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/construction/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Save failed')
      setEdit(false); await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function setStatus(status: string) {
    await fetch(`/api/construction/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }

  async function addMilestone() {
    if (!msName.trim()) return
    const res = await fetch(`/api/construction/projects/${id}/milestones`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: msName, weight: msWeight, targetDate: msDate || null }),
    })
    if (res.ok) { setMsName(''); setMsWeight('1'); setMsDate(''); await load() }
  }
  async function setMsStatus(mid: string, status: string) {
    await fetch(`/api/construction/projects/${id}/milestones?milestoneId=${mid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }
  async function delMilestone(mid: string) {
    await fetch(`/api/construction/projects/${id}/milestones?milestoneId=${mid}`, { method: 'DELETE' })
    await load()
  }

  async function postUpdate() {
    if (!upHeadline.trim()) return
    const res = await fetch(`/api/construction/projects/${id}/updates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headline: upHeadline, body: upBody || null, progressPct: upPct === '' ? null : upPct }),
    })
    if (res.ok) { setUpHeadline(''); setUpBody(''); setUpPct(''); await load() }
  }
  async function delUpdate(uid: string) {
    await fetch(`/api/construction/projects/${id}/updates?updateId=${uid}`, { method: 'DELETE' })
    await load()
  }

  async function uploadFile(file: File) {
    setUploading(true); setError(null)
    try {
      const u = await fetch('/api/crm/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload-url', type: 'construction_project', id, filename: file.name }),
      }).then((r) => r.json())
      if (u.error) throw new Error(u.error)
      const put = await fetch(u.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!put.ok) throw new Error('Upload failed')
      const rec = await fetch('/api/crm/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'construction_project', id, path: u.path, filename: u.filename, contentType: file.type, sizeBytes: file.size }),
      }).then((r) => r.json())
      if (rec.error) throw new Error(rec.error)
      await loadDocs()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally { setUploading(false) }
  }
  async function deleteDoc(docId: string) {
    await fetch(`/api/crm/documents?docId=${docId}`, { method: 'DELETE' })
    await loadDocs()
  }

  async function del() {
    if (!confirm('Delete this project? This cannot be undone.')) return
    const res = await fetch(`/api/construction/projects/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin/construction/projects')
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (error && !p) return <div className="text-red-400 py-12 text-center text-sm">{error}</div>
  if (!p) return null

  const field = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm'
  const fmt = (n: any) => (n ? Number(n).toLocaleString() : '—')
  const milestones = p.milestones || []
  const updates = p.updates || []
  const countryName = ref.countries.find((c) => c.code === p.country)?.name || p.country

  return (
    <div className="max-w-3xl">
      <Link href="/admin/construction/projects" className="text-xs text-primary hover:text-primary/80">← Projects</Link>

      <div className="flex items-start justify-between mt-3 mb-1 gap-4">
        <div>
          <div className="font-mono text-xs text-on-surface-variant/60">{p.reference}</div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">{p.name}</h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="uppercase tracking-wide bg-primary/15 text-primary px-2 py-0.5">{TYPE_LABEL[p.project_type]}</span>
            {p.client?.name && <Link href={`/admin/crm/companies/${p.client.id}`} className="text-on-surface-variant hover:text-primary">{p.client.name}</Link>}
            {p.deal?.id && <Link href={`/admin/crm/deals/${p.deal.id}`} className="text-on-surface-variant/70 hover:text-primary font-mono">{p.deal.reference}</Link>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <select value={p.status} onChange={(e) => setStatus(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-1.5 text-on-surface text-xs">
            {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          {!edit && <button onClick={() => setEdit(true)} className="text-xs text-primary border border-primary/30 px-3 py-1.5">Edit</button>}
        </div>
      </div>

      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 bg-surface-container-lowest h-2"><div className="bg-primary/70 h-2" style={{ width: `${p.progress_pct}%` }} /></div>
        <span className="text-sm text-on-surface tabular-nums flex-none">{p.progress_pct}%</span>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 my-3 text-sm text-red-400">{error}</div>}

      <div className="flex gap-1 border-b border-outline-variant/10 my-5 overflow-x-auto">
        {(['overview', 'milestones', 'updates', 'files', 'activity'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm capitalize border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            {t}{t === 'milestones' && milestones.length ? ` (${milestones.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-surface-container-low border border-outline-variant/10 p-5">
          {edit ? (
            <div className="space-y-3">
              <div><label className="block text-xs text-on-surface-variant mb-1">Name</label>
                <input value={draft.name} onChange={(e) => setDraft((x) => ({ ...x, name: e.target.value }))} className={field} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1">Type</label>
                  <select value={draft.projectType} onChange={(e) => setDraft((x) => ({ ...x, projectType: e.target.value }))} className={field}>
                    {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Country</label>
                  <select value={draft.country} onChange={(e) => setDraft((x) => ({ ...x, country: e.target.value }))} className={field}>
                    <option value="">—</option>
                    {ref.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select></div>
                <div className="col-span-2"><label className="block text-xs text-on-surface-variant mb-1">Site location</label>
                  <input value={draft.siteLocation} onChange={(e) => setDraft((x) => ({ ...x, siteLocation: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Contract value</label>
                  <input type="number" value={draft.contractValue} onChange={(e) => setDraft((x) => ({ ...x, contractValue: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Budget</label>
                  <input type="number" value={draft.budget} onChange={(e) => setDraft((x) => ({ ...x, budget: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Currency</label>
                  <select value={draft.currency} onChange={(e) => setDraft((x) => ({ ...x, currency: e.target.value }))} className={field}>
                    <option value="">—</option>
                    {ref.currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Progress % {milestones.length > 0 && <span className="text-on-surface-variant/40">(milestone-driven)</span>}</label>
                  <input type="number" min={0} max={100} disabled={milestones.length > 0} value={draft.progressPct} onChange={(e) => setDraft((x) => ({ ...x, progressPct: e.target.value }))} className={`${field} disabled:opacity-40`} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Start date</label>
                  <input type="date" value={draft.startDate} onChange={(e) => setDraft((x) => ({ ...x, startDate: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Target completion</label>
                  <input type="date" value={draft.targetCompletion} onChange={(e) => setDraft((x) => ({ ...x, targetCompletion: e.target.value }))} className={field} /></div>
              </div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Description</label>
                <textarea value={draft.description} onChange={(e) => setDraft((x) => ({ ...x, description: e.target.value }))} rows={3} className={`${field} resize-none`} /></div>
              <div className="flex gap-2 justify-between pt-2">
                <button onClick={del} className="px-3 py-1.5 text-xs text-red-400 border border-red-500/20">Delete project</button>
                <div className="flex gap-2">
                  <button onClick={() => { setEdit(false); load() }} className="px-3 py-1.5 text-sm text-on-surface-variant border border-outline-variant/10">Cancel</button>
                  <button onClick={save} disabled={saving} className="bg-primary text-on-primary font-semibold px-4 py-1.5 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-[140px_1fr] gap-y-2.5 gap-x-4 text-sm">
              <dt className="text-on-surface-variant/60">Status</dt><dd className="text-on-surface">{STATUS_LABEL[p.status]}</dd>
              <dt className="text-on-surface-variant/60">Site</dt><dd className="text-on-surface">{p.site_location || '—'}{countryName ? ` · ${countryName}` : ''}</dd>
              <dt className="text-on-surface-variant/60">Contract value</dt><dd className="text-on-surface tabular-nums">{fmt(p.contract_value)} {p.currency || ''}</dd>
              <dt className="text-on-surface-variant/60">Budget</dt><dd className="text-on-surface tabular-nums">{fmt(p.budget)} {p.currency || ''}</dd>
              <dt className="text-on-surface-variant/60">Start</dt><dd className="text-on-surface">{p.start_date || '—'}</dd>
              <dt className="text-on-surface-variant/60">Target completion</dt><dd className="text-on-surface">{p.target_completion || '—'}</dd>
              {p.actual_completion && <><dt className="text-on-surface-variant/60">Completed</dt><dd className="text-on-surface">{p.actual_completion}</dd></>}
              <dt className="text-on-surface-variant/60">Owner</dt><dd className="text-on-surface">{p.owner?.full_name || '—'}</dd>
              {p.description && <><dt className="text-on-surface-variant/60">Description</dt><dd className="text-on-surface whitespace-pre-wrap">{p.description}</dd></>}
            </dl>
          )}
          {!edit && <AiBriefing type="construction_project" id={id} />}
        </div>
      )}

      {tab === 'milestones' && (
        <div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 mb-4 flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-on-surface-variant mb-1">Milestone</label>
              <input value={msName} onChange={(e) => setMsName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addMilestone() }} className={field} placeholder="e.g. Foundations poured" />
            </div>
            <div className="w-20"><label className="block text-xs text-on-surface-variant mb-1">Weight</label>
              <input type="number" min={1} value={msWeight} onChange={(e) => setMsWeight(e.target.value)} className={field} /></div>
            <div className="w-36"><label className="block text-xs text-on-surface-variant mb-1">Target</label>
              <input type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} className={field} /></div>
            <button onClick={addMilestone} disabled={!msName.trim()} className="bg-primary text-on-primary font-semibold px-4 py-2 text-sm disabled:opacity-40">Add</button>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {milestones.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No milestones yet. Add phases and their weights to drive project progress.</p>}
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${m.status === 'done' ? 'text-on-surface-variant/50 line-through' : 'text-on-surface'}`}>{m.name}</p>
                  <p className="text-[11px] text-on-surface-variant/50">weight {m.weight}{m.target_date ? ` · target ${m.target_date}` : ''}{m.done_date ? ` · done ${m.done_date}` : ''}</p>
                </div>
                <select value={m.status} onChange={(e) => setMsStatus(m.id, e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-1 text-on-surface text-xs flex-none">
                  {MS_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => delMilestone(m.id)} className="text-xs text-on-surface-variant/40 hover:text-red-400 flex-none">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'updates' && (
        <div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 mb-4 space-y-2">
            <div className="flex gap-2">
              <input value={upHeadline} onChange={(e) => setUpHeadline(e.target.value)} placeholder="Progress report headline…" className={`${field} flex-1`} />
              <input type="number" min={0} max={100} value={upPct} onChange={(e) => setUpPct(e.target.value)} placeholder="%" className={`${field} w-20`} />
            </div>
            <textarea value={upBody} onChange={(e) => setUpBody(e.target.value)} rows={3} placeholder="Details (optional)…" className={`${field} resize-none`} />
            <div className="flex justify-end">
              <button onClick={postUpdate} disabled={!upHeadline.trim()} className="bg-primary text-on-primary font-semibold px-4 py-1.5 text-sm disabled:opacity-40">Post update</button>
            </div>
          </div>
          <div className="space-y-2">
            {updates.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No progress updates yet.</p>}
            {updates.map((u) => (
              <div key={u.id} className="bg-surface-container-low border border-outline-variant/10 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-on-surface font-medium">{u.headline}</span>
                  <span className="text-[11px] text-on-surface-variant/50 flex-none">{u.report_date}{u.progress_pct != null ? ` · ${u.progress_pct}%` : ''}</span>
                </div>
                {u.body && <p className="text-sm text-on-surface-variant mt-1.5 whitespace-pre-wrap">{u.body}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-on-surface-variant/40">{u.author?.full_name || 'Unknown'} · {timeAgo(u.created_at)}</span>
                  <button onClick={() => delUpdate(u.id)} className="text-[11px] text-on-surface-variant/40 hover:text-red-400">delete</button>
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
            {uploading ? 'Uploading…' : '＋ Upload a document for this project'}
          </label>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {docs.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No files.</p>}
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <a href={doc.url || '#'} target="_blank" rel="noopener" className="text-sm text-on-surface hover:text-primary truncate block">{doc.filename}</a>
                  <p className="text-[11px] text-on-surface-variant/50">{doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(0)} KB · ` : ''}{doc.uploadedBy || 'Unknown'} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => deleteDoc(doc.id)} className="text-[11px] text-error/60 hover:text-error flex-none">delete</button>
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
