'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const DESK = ['oil_gas', 'minerals', 'agri', 'other']
const DESK_LABEL: Record<string, string> = { oil_gas: 'Oil & Gas', minerals: 'Minerals', agri: 'Agri', other: 'Other' }
const SIDE = ['buy', 'sell']
const STATUS = ['inquiry', 'offer', 'negotiation', 'contract', 'nomination', 'in_transit', 'delivered', 'settled', 'closed', 'cancelled']
const STATUS_LABEL: Record<string, string> = {
  inquiry: 'Inquiry', offer: 'Offer', negotiation: 'Negotiation', contract: 'Contract', nomination: 'Nomination',
  in_transit: 'In transit', delivered: 'Delivered', settled: 'Settled', closed: 'Closed', cancelled: 'Cancelled',
}
const STEP_STATUS = ['pending', 'in_progress', 'done', 'waived', 'blocked']
const SHIP_STATUS = ['planned', 'nominated', 'loading', 'sailed', 'arrived', 'discharged', 'completed', 'cancelled']

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [t, setT] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'checklist' | 'shipments' | 'files' | 'activity'>('overview')
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [ref, setRef] = useState<any>({ countries: [], currencies: [] })

  const [stepName, setStepName] = useState('')
  const [ship, setShip] = useState<any>({ vesselName: '', blNumber: '', etd: '', eta: '' })

  const [docs, setDocs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [feed, setFeed] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trading/trades/${id}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Not found')
      setT(j.data)
      setDraft({
        title: j.data.title, desk: j.data.desk, side: j.data.side, status: j.data.status,
        commodity: j.data.commodity, grade: j.data.grade || '',
        quantity: j.data.quantity ?? '', quantityUnit: j.data.quantity_unit || '',
        priceBasis: j.data.price_basis || '', priceAmount: j.data.price_amount ?? '', currency: j.data.currency || '',
        incoterm: j.data.incoterm || '', loadPort: j.data.load_port || '', dischargePort: j.data.discharge_port || '',
        contractType: j.data.contract_type || '', laycanStart: j.data.laycan_start || '', laycanEnd: j.data.laycan_end || '',
        notes: j.data.notes || '',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [id])

  const loadDocs = useCallback(async () => { const r = await fetch(`/api/crm/documents?type=commodity_trade&id=${id}`); if (r.ok) setDocs((await r.json()).data) }, [id])
  const loadFeed = useCallback(async () => { const r = await fetch(`/api/crm/timeline?type=commodity_trade&id=${id}`); if (r.ok) setFeed((await r.json()).data) }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/reference').then((r) => r.ok && r.json()).then((j) => j && setRef({ countries: j.countries || [], currencies: j.currencies || [] }))
  }, [])
  useEffect(() => { if (tab === 'files') loadDocs() }, [tab, loadDocs])
  useEffect(() => { if (tab === 'activity') loadFeed() }, [tab, loadFeed])

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/trading/trades/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Save failed')
      setEdit(false); await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function setStatus(status: string) {
    await fetch(`/api/trading/trades/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }

  async function seedChecklist() {
    const res = await fetch(`/api/trading/trades/${id}/steps`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preset: true }) })
    if (res.ok) await load()
    else { const j = await res.json(); setError(j.error || 'Could not seed checklist') }
  }
  async function addStep() {
    if (!stepName.trim()) return
    const res = await fetch(`/api/trading/trades/${id}/steps`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: stepName }) })
    if (res.ok) { setStepName(''); await load() }
  }
  async function setStepStatus(sid: string, status: string) {
    await fetch(`/api/trading/trades/${id}/steps?stepId=${sid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }
  async function delStep(sid: string) {
    await fetch(`/api/trading/trades/${id}/steps?stepId=${sid}`, { method: 'DELETE' })
    await load()
  }

  async function addShipment() {
    const res = await fetch(`/api/trading/trades/${id}/shipments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ship) })
    if (res.ok) { setShip({ vesselName: '', blNumber: '', etd: '', eta: '' }); await load() }
  }
  async function setShipmentStatus(sid: string, status: string) {
    await fetch(`/api/trading/trades/${id}/shipments?shipmentId=${sid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }
  async function delShipment(sid: string) {
    await fetch(`/api/trading/trades/${id}/shipments?shipmentId=${sid}`, { method: 'DELETE' })
    await load()
  }

  async function uploadFile(file: File) {
    setUploading(true); setError(null)
    try {
      const u = await fetch('/api/crm/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload-url', type: 'commodity_trade', id, filename: file.name }),
      }).then((r) => r.json())
      if (u.error) throw new Error(u.error)
      const put = await fetch(u.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!put.ok) throw new Error('Upload failed')
      const rec = await fetch('/api/crm/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'commodity_trade', id, path: u.path, filename: u.filename, contentType: file.type, sizeBytes: file.size }),
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
    if (!confirm('Delete this trade? This cannot be undone.')) return
    const res = await fetch(`/api/trading/trades/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin/trading/trades')
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (error && !t) return <div className="text-red-400 py-12 text-center text-sm">{error}</div>
  if (!t) return null

  const field = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm'
  const fmt = (n: any) => (n ? Number(n).toLocaleString() : '—')
  const steps = t.steps || []
  const shipments = t.shipments || []
  const doneSteps = steps.filter((s) => ['done', 'waived'].includes(s.status)).length

  return (
    <div className="max-w-3xl">
      <Link href="/admin/trading/trades" className="text-xs text-primary hover:text-primary/80">← Trades</Link>

      <div className="flex items-start justify-between mt-3 mb-1 gap-4">
        <div>
          <div className="font-mono text-xs text-on-surface-variant/60">{t.reference}</div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">{t.title}</h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="uppercase tracking-wide bg-primary/15 text-primary px-2 py-0.5">{t.side} · {DESK_LABEL[t.desk]}</span>
            {t.counterparty?.name && <Link href={`/admin/crm/companies/${t.counterparty.id}`} className="text-on-surface-variant hover:text-primary">{t.counterparty.name}</Link>}
            {t.deal?.id && <Link href={`/admin/crm/deals/${t.deal.id}`} className="text-on-surface-variant/70 hover:text-primary font-mono">{t.deal.reference}</Link>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <select value={t.status} onChange={(e) => setStatus(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-1.5 text-on-surface text-xs">
            {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          {!edit && <button onClick={() => setEdit(true)} className="text-xs text-primary border border-primary/30 px-3 py-1.5">Edit</button>}
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 my-3 text-sm text-red-400">{error}</div>}

      <div className="flex gap-1 border-b border-outline-variant/10 my-5 overflow-x-auto">
        {(['overview', 'checklist', 'shipments', 'files', 'activity'] as const).map((x) => (
          <button key={x} onClick={() => setTab(x)}
            className={`px-4 py-2.5 text-sm capitalize border-b-2 transition-colors ${tab === x ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            {x}{x === 'checklist' && steps.length ? ` (${doneSteps}/${steps.length})` : ''}{x === 'shipments' && shipments.length ? ` (${shipments.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-surface-container-low border border-outline-variant/10 p-5">
          {edit ? (
            <div className="space-y-3">
              <div><label className="block text-xs text-on-surface-variant mb-1">Title</label>
                <input value={draft.title} onChange={(e) => setDraft((x) => ({ ...x, title: e.target.value }))} className={field} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-on-surface-variant mb-1">Desk</label>
                  <select value={draft.desk} onChange={(e) => setDraft((x) => ({ ...x, desk: e.target.value }))} className={field}>
                    {DESK.map((s) => <option key={s} value={s}>{DESK_LABEL[s]}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Side</label>
                  <select value={draft.side} onChange={(e) => setDraft((x) => ({ ...x, side: e.target.value }))} className={field}>
                    {SIDE.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Incoterm</label>
                  <input value={draft.incoterm} onChange={(e) => setDraft((x) => ({ ...x, incoterm: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Commodity</label>
                  <input value={draft.commodity} onChange={(e) => setDraft((x) => ({ ...x, commodity: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Grade</label>
                  <input value={draft.grade} onChange={(e) => setDraft((x) => ({ ...x, grade: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Contract type</label>
                  <input value={draft.contractType} onChange={(e) => setDraft((x) => ({ ...x, contractType: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Quantity</label>
                  <input type="number" value={draft.quantity} onChange={(e) => setDraft((x) => ({ ...x, quantity: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Unit</label>
                  <input value={draft.quantityUnit} onChange={(e) => setDraft((x) => ({ ...x, quantityUnit: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Currency</label>
                  <select value={draft.currency} onChange={(e) => setDraft((x) => ({ ...x, currency: e.target.value }))} className={field}>
                    <option value="">—</option>
                    {ref.currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select></div>
                <div className="col-span-2"><label className="block text-xs text-on-surface-variant mb-1">Price basis</label>
                  <input value={draft.priceBasis} onChange={(e) => setDraft((x) => ({ ...x, priceBasis: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Price</label>
                  <input type="number" value={draft.priceAmount} onChange={(e) => setDraft((x) => ({ ...x, priceAmount: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Load port</label>
                  <input value={draft.loadPort} onChange={(e) => setDraft((x) => ({ ...x, loadPort: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Discharge port</label>
                  <input value={draft.dischargePort} onChange={(e) => setDraft((x) => ({ ...x, dischargePort: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Laycan start</label>
                  <input type="date" value={draft.laycanStart} onChange={(e) => setDraft((x) => ({ ...x, laycanStart: e.target.value }))} className={field} /></div>
                <div><label className="block text-xs text-on-surface-variant mb-1">Laycan end</label>
                  <input type="date" value={draft.laycanEnd} onChange={(e) => setDraft((x) => ({ ...x, laycanEnd: e.target.value }))} className={field} /></div>
              </div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Notes</label>
                <textarea value={draft.notes} onChange={(e) => setDraft((x) => ({ ...x, notes: e.target.value }))} rows={3} className={`${field} resize-none`} /></div>
              <div className="flex gap-2 justify-between pt-2">
                <button onClick={del} className="px-3 py-1.5 text-xs text-red-400 border border-red-500/20">Delete trade</button>
                <div className="flex gap-2">
                  <button onClick={() => { setEdit(false); load() }} className="px-3 py-1.5 text-sm text-on-surface-variant border border-outline-variant/10">Cancel</button>
                  <button onClick={save} disabled={saving} className="bg-primary text-on-primary font-semibold px-4 py-1.5 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-[140px_1fr] gap-y-2.5 gap-x-4 text-sm">
              <dt className="text-on-surface-variant/60">Status</dt><dd className="text-on-surface">{STATUS_LABEL[t.status]}</dd>
              <dt className="text-on-surface-variant/60">Commodity</dt><dd className="text-on-surface">{t.commodity}{t.grade ? ` · ${t.grade}` : ''}</dd>
              <dt className="text-on-surface-variant/60">Quantity</dt><dd className="text-on-surface tabular-nums">{fmt(t.quantity)} {t.quantity_unit || ''}</dd>
              <dt className="text-on-surface-variant/60">Price</dt><dd className="text-on-surface">{t.price_basis || '—'}{t.price_amount ? ` · ${fmt(t.price_amount)} ${t.currency || ''}` : ''}</dd>
              <dt className="text-on-surface-variant/60">Incoterm</dt><dd className="text-on-surface">{t.incoterm || '—'} {t.contract_type ? `· ${t.contract_type}` : ''}</dd>
              <dt className="text-on-surface-variant/60">Route</dt><dd className="text-on-surface">{t.load_port || '—'} → {t.discharge_port || '—'}</dd>
              <dt className="text-on-surface-variant/60">Laycan</dt><dd className="text-on-surface">{t.laycan_start || '—'} → {t.laycan_end || '—'}</dd>
              <dt className="text-on-surface-variant/60">Owner</dt><dd className="text-on-surface">{t.owner?.full_name || '—'}</dd>
              {t.notes && <><dt className="text-on-surface-variant/60">Notes</dt><dd className="text-on-surface whitespace-pre-wrap">{t.notes}</dd></>}
            </dl>
          )}
        </div>
      )}

      {tab === 'checklist' && (
        <div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 mb-4 flex flex-wrap gap-2 items-center">
            <input value={stepName} onChange={(e) => setStepName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addStep() }} placeholder="Add a step…" className={`${field} flex-1 min-w-[160px]`} />
            <button onClick={addStep} disabled={!stepName.trim()} className="bg-primary text-on-primary font-semibold px-4 py-2 text-sm disabled:opacity-40">Add</button>
            {steps.length === 0 && <button onClick={seedChecklist} className="text-xs text-primary border border-primary/30 px-3 py-2">Seed standard checklist</button>}
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {steps.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No steps yet.</p>}
            {steps.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${['done', 'waived'].includes(s.status) ? 'text-on-surface-variant/50 line-through' : 'text-on-surface'}`}>{s.name}</p>
                  <p className="text-[11px] text-on-surface-variant/50">{s.due_date ? `due ${s.due_date}` : ''}{s.done_date ? ` · done ${s.done_date}` : ''}</p>
                </div>
                <select value={s.status} onChange={(e) => setStepStatus(s.id, e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-1 text-on-surface text-xs flex-none">
                  {STEP_STATUS.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
                <button onClick={() => delStep(s.id)} className="text-xs text-on-surface-variant/40 hover:text-red-400 flex-none">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'shipments' && (
        <div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <div><label className="block text-xs text-on-surface-variant mb-1">Vessel</label>
              <input value={ship.vesselName} onChange={(e) => setShip((s) => ({ ...s, vesselName: e.target.value }))} className={field} /></div>
            <div><label className="block text-xs text-on-surface-variant mb-1">B/L no.</label>
              <input value={ship.blNumber} onChange={(e) => setShip((s) => ({ ...s, blNumber: e.target.value }))} className={field} /></div>
            <div><label className="block text-xs text-on-surface-variant mb-1">ETD</label>
              <input type="date" value={ship.etd} onChange={(e) => setShip((s) => ({ ...s, etd: e.target.value }))} className={field} /></div>
            <div><label className="block text-xs text-on-surface-variant mb-1">ETA</label>
              <input type="date" value={ship.eta} onChange={(e) => setShip((s) => ({ ...s, eta: e.target.value }))} className={field} /></div>
            <button onClick={addShipment} className="bg-primary text-on-primary font-semibold px-4 py-2 text-sm col-span-2 sm:col-span-1">Add shipment</button>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {shipments.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No shipments yet.</p>}
            {shipments.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface truncate">{s.vessel_name || 'Vessel TBN'}{s.bl_number ? ` · B/L ${s.bl_number}` : ''}</p>
                  <p className="text-[11px] text-on-surface-variant/50">
                    {s.etd ? `ETD ${s.etd}` : ''}{s.eta ? ` · ETA ${s.eta}` : ''}
                    {s.quantity_loaded ? ` · loaded ${Number(s.quantity_loaded).toLocaleString()}` : ''}
                    {s.quantity_discharged ? ` · disch ${Number(s.quantity_discharged).toLocaleString()}` : ''}
                  </p>
                </div>
                <select value={s.status} onChange={(e) => setShipmentStatus(s.id, e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-1 text-on-surface text-xs flex-none">
                  {SHIP_STATUS.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
                <button onClick={() => delShipment(s.id)} className="text-xs text-on-surface-variant/40 hover:text-red-400 flex-none">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'files' && (
        <div>
          <label className="mb-4 flex items-center gap-3 bg-surface-container-low border border-dashed border-outline-variant/30 hover:border-primary/50 transition-colors px-4 py-5 cursor-pointer text-sm text-on-surface-variant">
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} disabled={uploading} />
            {uploading ? 'Uploading…' : '＋ Upload a document for this trade'}
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
