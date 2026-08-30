'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AiBriefing from '@/components/AiBriefing'

const KINDS = ['property_sale', 'property_rental', 'investment', 'advisory', 'other']
const KIND_LABEL: Record<string, string> = {
  property_sale: 'Property sale', property_rental: 'Property rental', investment: 'Investment',
  advisory: 'Advisory', other: 'Other',
}
const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'due_diligence', 'agreement', 'closed_won', 'closed_lost']
const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead', qualified: 'Qualified', proposal: 'Proposal', negotiation: 'Negotiation',
  due_diligence: 'Due diligence', agreement: 'Agreement', closed_won: 'Won', closed_lost: 'Lost',
}
const ROLES = ['buyer', 'seller', 'investor', 'landlord', 'tenant', 'agent', 'advisor', 'lender', 'other']

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'parties' | 'notes' | 'files' | 'activity'>('overview')
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [ref, setRef] = useState<any>({ currencies: [], countries: [] })

  const [addRole, setAddRole] = useState('buyer')
  const [pq, setPq] = useState('')
  const [pResults, setPResults] = useState<any[]>([])

  const [notes, setNotes] = useState<any[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [docs, setDocs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [feed, setFeed] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/deals/${id}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Not found')
      setD(j.data)
      setDraft({
        title: j.data.title, kind: j.data.kind, stage: j.data.stage,
        valueAmount: j.data.value_amount ?? '', agreedAmount: j.data.agreed_amount ?? '',
        currency: j.data.currency || '', commissionAmount: j.data.commission_amount ?? '',
        probability: j.data.probability, expectedClose: j.data.expected_close || '',
        country: j.data.country || '', lostReason: j.data.lost_reason || '', description: j.data.description || '',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [id])

  const loadNotes = useCallback(async () => { const r = await fetch(`/api/crm/notes?type=deal&id=${id}`); if (r.ok) setNotes((await r.json()).data) }, [id])
  const loadDocs = useCallback(async () => { const r = await fetch(`/api/crm/documents?type=deal&id=${id}`); if (r.ok) setDocs((await r.json()).data) }, [id])
  const loadFeed = useCallback(async () => { const r = await fetch(`/api/crm/timeline?type=deal&id=${id}`); if (r.ok) setFeed((await r.json()).data) }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/reference').then((r) => r.ok && r.json()).then((j) => j && setRef({ currencies: j.currencies || [], countries: j.countries || [] }))
  }, [])
  useEffect(() => { if (tab === 'notes') loadNotes() }, [tab, loadNotes])
  useEffect(() => { if (tab === 'files') loadDocs() }, [tab, loadDocs])
  useEffect(() => { if (tab === 'activity') loadFeed() }, [tab, loadFeed])

  useEffect(() => {
    if (tab !== 'parties' || pq.trim().length < 2) { setPResults([]); return }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/crm/search?q=${encodeURIComponent(pq.trim())}`)
      if (r.ok) {
        const j = await r.json()
        setPResults((j.data || []).filter((x: any) => x.kind === 'contact' || x.kind === 'company'))
      }
    }, 300)
    return () => clearTimeout(t)
  }, [pq, tab])

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Save failed')
      setEdit(false); await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function setStage(stage: string) {
    await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) })
    await load()
  }

  async function addParty(kind: 'contact' | 'company', pid: string) {
    const body = kind === 'contact' ? { contactId: pid, role: addRole } : { companyId: pid, role: addRole }
    const res = await fetch(`/api/deals/${id}/parties`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { setPq(''); await load() }
    else { const j = await res.json(); setError(j.error || 'Could not add party') }
  }
  async function removeParty(partyId: string) {
    await fetch(`/api/deals/${id}/parties?partyId=${partyId}`, { method: 'DELETE' })
    await load()
  }

  async function addNote() {
    if (!noteBody.trim()) return
    const res = await fetch('/api/crm/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'deal', id, body: noteBody }) })
    if (res.ok) { setNoteBody(''); await loadNotes() }
  }

  async function uploadFile(file: File) {
    setUploading(true); setError(null)
    try {
      const u = await fetch('/api/crm/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload-url', type: 'deal', id, filename: file.name }),
      }).then((r) => r.json())
      if (u.error) throw new Error(u.error)
      const put = await fetch(u.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!put.ok) throw new Error('Upload failed')
      const rec = await fetch('/api/crm/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'deal', id, path: u.path, filename: u.filename, contentType: file.type, sizeBytes: file.size }),
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
    if (!confirm('Delete this deal? This cannot be undone.')) return
    const res = await fetch(`/api/deals/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin/crm/deals')
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (error && !d) return <div className="text-red-400 py-12 text-center text-sm">{error}</div>
  if (!d) return null

  const field = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm'
  const fmt = (n: any) => (n ? Number(n).toLocaleString() : '—')
  const subject = d.property ? `Property · ${d.property.title}` : d.investment ? `Investment · ${d.investment.title}` : null

  return (
    <div className="max-w-3xl">
      <Link href="/admin/crm/deals" className="text-xs text-primary hover:text-primary/80">← Deals</Link>

      <div className="flex items-start justify-between mt-3 mb-1 gap-4">
        <div>
          <div className="font-mono text-xs text-on-surface-variant/60">{d.reference}</div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">{d.title}</h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="uppercase tracking-wide bg-primary/15 text-primary px-2 py-0.5">{KIND_LABEL[d.kind]}</span>
            {d.company?.name && <Link href={`/admin/crm/companies/${d.company.id}`} className="text-on-surface-variant hover:text-primary">{d.company.name}</Link>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <select value={d.stage} onChange={(e) => setStage(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-1.5 text-on-surface text-xs">
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
          {!edit && <button onClick={() => setEdit(true)} className="text-xs text-primary border border-primary/30 px-3 py-1.5">Edit</button>}
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 my-3 text-sm text-red-400">{error}</div>}

      <div className="flex gap-1 border-b border-outline-variant/10 my-5 overflow-x-auto">
        {(['overview', 'parties', 'notes', 'files', 'activity'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm capitalize border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            {t}{t === 'parties' && d.parties?.length ? ` (${d.parties.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-surface-container-low border border-outline-variant/10 p-5">
          {edit ? (
            <div className="space-y-3">
              <div><label className="block text-xs text-on-surface-variant mb-1">Title</label>
                <input value={draft.title} onChange={(e) => setDraft((x) => ({ ...x, title: e.target.value }))} className={field} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1">Type</label>
                  <select value={draft.kind} onChange={(e) => setDraft((x) => ({ ...x, kind: e.target.value }))} className={field}>
                    {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Country</label>
                  <select value={draft.country} onChange={(e) => setDraft((x) => ({ ...x, country: e.target.value }))} className={field}>
                    <option value="">—</option>
                    {ref.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Value</label>
                  <input type="number" value={draft.valueAmount} onChange={(e) => setDraft((x) => ({ ...x, valueAmount: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Agreed amount</label>
                  <input type="number" value={draft.agreedAmount} onChange={(e) => setDraft((x) => ({ ...x, agreedAmount: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Currency</label>
                  <select value={draft.currency} onChange={(e) => setDraft((x) => ({ ...x, currency: e.target.value }))} className={field}>
                    <option value="">—</option>
                    {ref.currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Commission</label>
                  <input type="number" value={draft.commissionAmount} onChange={(e) => setDraft((x) => ({ ...x, commissionAmount: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Probability %</label>
                  <input type="number" min={0} max={100} value={draft.probability} onChange={(e) => setDraft((x) => ({ ...x, probability: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Expected close</label>
                  <input type="date" value={draft.expectedClose} onChange={(e) => setDraft((x) => ({ ...x, expectedClose: e.target.value }))} className={field} /></div>
              </div>
              {draft.stage === 'closed_lost' && (
                <div><label className="block text-xs text-on-surface-variant mb-1">Lost reason</label>
                  <input value={draft.lostReason} onChange={(e) => setDraft((x) => ({ ...x, lostReason: e.target.value }))} className={field} /></div>
              )}
              <div><label className="block text-xs text-on-surface-variant mb-1">Description</label>
                <textarea value={draft.description} onChange={(e) => setDraft((x) => ({ ...x, description: e.target.value }))} rows={3} className={`${field} resize-none`} /></div>
              <div className="flex gap-2 justify-between pt-2">
                <button onClick={del} className="px-3 py-1.5 text-xs text-red-400 border border-red-500/20">Delete deal</button>
                <div className="flex gap-2">
                  <button onClick={() => { setEdit(false); load() }} className="px-3 py-1.5 text-sm text-on-surface-variant border border-outline-variant/10">Cancel</button>
                  <button onClick={save} disabled={saving} className="bg-primary text-on-primary font-semibold px-4 py-1.5 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-[130px_1fr] gap-y-2.5 gap-x-4 text-sm">
              <dt className="text-on-surface-variant/60">Stage</dt><dd className="text-on-surface">{STAGE_LABEL[d.stage]}</dd>
              {subject && <><dt className="text-on-surface-variant/60">Subject</dt><dd className="text-on-surface">{subject}</dd></>}
              <dt className="text-on-surface-variant/60">Value</dt><dd className="text-on-surface tabular-nums">{fmt(d.value_amount)} {d.currency || ''}</dd>
              <dt className="text-on-surface-variant/60">Agreed</dt><dd className="text-on-surface tabular-nums">{fmt(d.agreed_amount)} {d.currency || ''}</dd>
              <dt className="text-on-surface-variant/60">Commission</dt><dd className="text-on-surface tabular-nums">{fmt(d.commission_amount)} {d.currency || ''}</dd>
              <dt className="text-on-surface-variant/60">Probability</dt><dd className="text-on-surface">{d.probability}%</dd>
              <dt className="text-on-surface-variant/60">Expected close</dt><dd className="text-on-surface">{d.expected_close || '—'}</dd>
              {d.closed_at && <><dt className="text-on-surface-variant/60">Closed</dt><dd className="text-on-surface">{d.closed_at}</dd></>}
              {d.lost_reason && <><dt className="text-on-surface-variant/60">Lost reason</dt><dd className="text-on-surface">{d.lost_reason}</dd></>}
              <dt className="text-on-surface-variant/60">Country</dt><dd className="text-on-surface">{ref.countries.find((c) => c.code === d.country)?.name || d.country || '—'}</dd>
              <dt className="text-on-surface-variant/60">Owner</dt><dd className="text-on-surface">{d.owner?.full_name || '—'}</dd>
              {d.description && <><dt className="text-on-surface-variant/60">Notes</dt><dd className="text-on-surface whitespace-pre-wrap">{d.description}</dd></>}
            </dl>
          )}
          {!edit && <AiBriefing type="deal" id={id} />}
        </div>
      )}

      {tab === 'parties' && (
        <div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 mb-4">
            <div className="flex gap-2 mb-2">
              <select value={addRole} onChange={(e) => setAddRole(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-2 text-on-surface text-xs">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Search contacts and companies…" className="flex-1 bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm" />
            </div>
            {pResults.length > 0 && (
              <div className="max-h-52 overflow-y-auto divide-y divide-outline-variant/10 border border-outline-variant/10">
                {pResults.map((c) => (
                  <button key={`${c.kind}-${c.id}`} onClick={() => addParty(c.kind, c.id)} className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-lowest flex justify-between gap-2">
                    <span className="truncate">{c.label}{c.sub ? <span className="text-on-surface-variant/50"> · {c.sub}</span> : ''}</span>
                    <span className="text-[10px] text-on-surface-variant/50 uppercase flex-none">{c.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {(!d.parties || d.parties.length === 0) && <p className="text-on-surface-variant/60 text-sm text-center py-8">No parties on this deal yet.</p>}
            {(d.parties || []).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-[10px] uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 flex-none w-16 text-center">{p.role}</span>
                <div className="flex-1 min-w-0">
                  {p.contact
                    ? <Link href={`/admin/crm/contacts/${p.contact.id}`} className="text-sm text-on-surface hover:text-primary truncate block">{p.contact.name}{p.contact.email ? ` · ${p.contact.email}` : ''}</Link>
                    : <Link href={`/admin/crm/companies/${p.company?.id}`} className="text-sm text-on-surface hover:text-primary truncate block">{p.company?.name}</Link>}
                </div>
                <button onClick={() => removeParty(p.id)} className="text-xs text-on-surface-variant/40 hover:text-red-400 flex-none">✕</button>
              </div>
            ))}
          </div>
        </div>
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

      {tab === 'files' && (
        <div>
          <label className="mb-4 flex items-center gap-3 bg-surface-container-low border border-dashed border-outline-variant/30 hover:border-primary/50 transition-colors px-4 py-5 cursor-pointer text-sm text-on-surface-variant">
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} disabled={uploading} />
            {uploading ? 'Uploading…' : '＋ Upload a document for this deal'}
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
