'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'

const STATUS = ['draft', 'open', 'partially_filled', 'filled', 'on_hold', 'closed', 'cancelled']
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', open: 'Open', partially_filled: 'Partly filled', filled: 'Filled',
  on_hold: 'On hold', closed: 'Closed', cancelled: 'Cancelled',
}
const STAGES = ['sourced', 'shortlisted', 'interview', 'selected', 'offer', 'medical', 'visa', 'ticketing', 'deployed', 'rejected', 'withdrawn']
const STAGE_LABEL: Record<string, string> = {
  sourced: 'Sourced', shortlisted: 'Shortlisted', interview: 'Interview', selected: 'Selected',
  offer: 'Offer', medical: 'Medical', visa: 'Visa', ticketing: 'Ticketing', deployed: 'Deployed',
  rejected: 'Rejected', withdrawn: 'Withdrawn',
}
const ACTIVE_STAGES = ['sourced', 'shortlisted', 'interview', 'selected', 'offer', 'medical', 'visa', 'ticketing']

export default function JobOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [o, setO] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [ref, setRef] = useState<any>({ countries: [], currencies: [] })

  const [showAdd, setShowAdd] = useState(false)
  const [cq, setCq] = useState('')
  const [cands, setCands] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recruitment/orders/${id}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Not found')
      setO(j.data)
      setDraft({
        title: j.data.title, tradeCategory: j.data.trade_category, specificRole: j.data.specific_role || '',
        headcount: j.data.headcount, destinationCountry: j.data.destination_country || '',
        salaryMin: j.data.salary_min ?? '', salaryMax: j.data.salary_max ?? '', salaryCurrency: j.data.salary_currency || '',
        contractMonths: j.data.contract_months ?? '', targetDate: j.data.target_date || '',
        requirements: j.data.requirements || '', status: j.data.status,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/reference').then((r) => r.ok && r.json()).then((j) => j && setRef({ countries: j.countries || [], currencies: j.currencies || [] }))
  }, [])

  useEffect(() => {
    if (!showAdd) return
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const p = new URLSearchParams({ excludeOrder: id })
        if (cq.trim()) p.set('q', cq.trim())
        const r = await fetch(`/api/recruitment/candidates?${p}`)
        if (r.ok) setCands((await r.json()).data)
      } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [cq, showAdd, id])

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/recruitment/orders/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Save failed')
      setEdit(false); await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function setStatus(status: string) {
    await fetch(`/api/recruitment/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }

  async function addCandidate(candidateId: string) {
    const res = await fetch('/api/recruitment/placements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobOrderId: id, candidateId }),
    })
    if (res.ok) { setCands((c) => c.filter((x) => x.id !== candidateId)); await load() }
    else { const j = await res.json(); setError(j.error || 'Could not add') }
  }

  async function moveStage(placementId: string, stage: string) {
    await fetch(`/api/recruitment/placements?id=${placementId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) })
    await load()
  }

  async function removePlacement(placementId: string) {
    await fetch(`/api/recruitment/placements?id=${placementId}`, { method: 'DELETE' })
    await load()
  }

  const field = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm'

  if (loading) return <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
  if (error && !o) return <div className="text-red-400 py-12 text-center text-sm">{error}</div>
  if (!o) return null

  const placements = o.placements || []
  const deployed = placements.filter((p) => p.stage === 'deployed').length
  const active = placements.filter((p) => ACTIVE_STAGES.includes(p.stage))
  const closed = placements.filter((p) => ['rejected', 'withdrawn'].includes(p.stage))
  const countryName = ref.countries.find((c) => c.code === o.destination_country)?.name || o.destination_country

  return (
    <div className="max-w-4xl">
      <Link href="/admin/recruitment/orders" className="text-xs text-on-surface-variant/60 hover:text-primary">← Job orders</Link>

      <div className="flex items-start justify-between mt-2 mb-1 gap-4">
        <div>
          <div className="font-mono text-xs text-on-surface-variant/60">{o.reference}</div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">{o.title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <select value={o.status} onChange={(e) => setStatus(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-1.5 text-on-surface text-xs">
            {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          {!edit && <button onClick={() => setEdit(true)} className="text-xs text-primary border border-primary/30 px-3 py-1.5">Edit</button>}
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 my-3 text-sm text-red-400">{error}</div>}

      <div className="bg-surface-container-low border border-outline-variant/10 p-5 my-4">
        {edit ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-on-surface-variant mb-1">Title</label>
                <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={field} /></div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Trade category</label>
                <input value={draft.tradeCategory} onChange={(e) => setDraft((d) => ({ ...d, tradeCategory: e.target.value }))} className={field} /></div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Specific role</label>
                <input value={draft.specificRole} onChange={(e) => setDraft((d) => ({ ...d, specificRole: e.target.value }))} className={field} /></div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Headcount</label>
                <input type="number" min={1} value={draft.headcount} onChange={(e) => setDraft((d) => ({ ...d, headcount: e.target.value }))} className={field} /></div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Destination country</label>
                <select value={draft.destinationCountry} onChange={(e) => setDraft((d) => ({ ...d, destinationCountry: e.target.value }))} className={field}>
                  <option value="">—</option>
                  {ref.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select></div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Target date</label>
                <input type="date" value={draft.targetDate} onChange={(e) => setDraft((d) => ({ ...d, targetDate: e.target.value }))} className={field} /></div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Salary min</label>
                <input type="number" value={draft.salaryMin} onChange={(e) => setDraft((d) => ({ ...d, salaryMin: e.target.value }))} className={field} /></div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Salary max</label>
                <input type="number" value={draft.salaryMax} onChange={(e) => setDraft((d) => ({ ...d, salaryMax: e.target.value }))} className={field} /></div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Currency</label>
                <select value={draft.salaryCurrency} onChange={(e) => setDraft((d) => ({ ...d, salaryCurrency: e.target.value }))} className={field}>
                  <option value="">—</option>
                  {ref.currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select></div>
              <div><label className="block text-xs text-on-surface-variant mb-1">Contract (months)</label>
                <input type="number" value={draft.contractMonths} onChange={(e) => setDraft((d) => ({ ...d, contractMonths: e.target.value }))} className={field} /></div>
            </div>
            <div><label className="block text-xs text-on-surface-variant mb-1">Requirements</label>
              <textarea value={draft.requirements} onChange={(e) => setDraft((d) => ({ ...d, requirements: e.target.value }))} rows={3} className={`${field} resize-none`} /></div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => { setEdit(false); load() }} className="px-3 py-1.5 text-sm text-on-surface-variant border border-outline-variant/10">Cancel</button>
              <button onClick={save} disabled={saving} className="bg-primary text-on-primary font-semibold px-4 py-1.5 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-[130px_1fr] gap-y-2.5 gap-x-4 text-sm">
            <dt className="text-on-surface-variant/60">Trade</dt><dd className="text-on-surface">{o.trade_category}{o.specific_role ? ` · ${o.specific_role}` : ''}</dd>
            <dt className="text-on-surface-variant/60">Destination</dt><dd className="text-on-surface">{countryName || '—'}</dd>
            <dt className="text-on-surface-variant/60">Headcount</dt><dd className="text-on-surface">{deployed}/{o.headcount} deployed</dd>
            <dt className="text-on-surface-variant/60">Salary</dt><dd className="text-on-surface">{o.salary_min || o.salary_max ? `${o.salary_min ?? '?'}–${o.salary_max ?? '?'} ${o.salary_currency || ''}` : '—'}</dd>
            <dt className="text-on-surface-variant/60">Contract</dt><dd className="text-on-surface">{o.contract_months ? `${o.contract_months} months` : '—'}</dd>
            <dt className="text-on-surface-variant/60">Target date</dt><dd className="text-on-surface">{o.target_date || '—'}</dd>
            <dt className="text-on-surface-variant/60">Client</dt><dd className="text-on-surface">{o.employer?.company_name || o.oep?.company_name || o.company?.name || '—'}</dd>
            <dt className="text-on-surface-variant/60">Owner</dt><dd className="text-on-surface">{o.owner?.full_name || '—'}</dd>
            {o.requirements && <><dt className="text-on-surface-variant/60">Requirements</dt><dd className="text-on-surface whitespace-pre-wrap">{o.requirements}</dd></>}
          </dl>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60">Candidates · {placements.length}</h2>
        <button onClick={() => setShowAdd(true)} className="text-xs text-primary border border-primary/30 px-3 py-1.5">+ Add candidate</button>
      </div>

      {placements.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-12 text-center text-on-surface-variant text-sm">No candidates on this order yet.</div>
      ) : (
        <div className="space-y-4">
          <PlacementGroup label="In pipeline" rows={active} onMove={moveStage} onRemove={removePlacement} />
          {deployed > 0 && <PlacementGroup label="Deployed" rows={placements.filter((p) => p.stage === 'deployed')} onMove={moveStage} onRemove={removePlacement} />}
          {closed.length > 0 && <PlacementGroup label="Rejected / withdrawn" rows={closed} onMove={moveStage} onRemove={removePlacement} muted />}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface-container-low border border-outline-variant/10 w-full max-w-lg max-h-[85vh] flex flex-col p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-4">Add candidate</h2>
            <input value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Search name, role or trade…" autoFocus className={field} />
            <div className="mt-3 overflow-y-auto flex-1 divide-y divide-outline-variant/10">
              {searching && <p className="text-on-surface-variant/50 text-sm py-4 text-center">Searching…</p>}
              {!searching && cands.length === 0 && <p className="text-on-surface-variant/50 text-sm py-4 text-center">No candidates found.</p>}
              {cands.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-on-surface truncate">{c.full_name}</div>
                    <div className="text-xs text-on-surface-variant/60 truncate">{c.trade_category}{c.specific_role ? ` · ${c.specific_role}` : ''} · {c.nationality} · {c.years_experience}y</div>
                  </div>
                  <button onClick={() => addCandidate(c.id)} className="text-xs text-primary border border-primary/30 px-3 py-1 flex-none">Add</button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-on-surface-variant border border-outline-variant/10">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlacementGroup({ label, rows, onMove, onRemove, muted }: any) {
  if (!rows.length) return null
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wide text-on-surface-variant/50 mb-2">{label} · {rows.length}</h3>
      <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
        {rows.map((p: any) => (
          <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${muted ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-0">
              <Link href={`/admin/workforce`} className="text-sm text-on-surface hover:text-primary truncate block">{p.candidate?.full_name || '—'}</Link>
              <div className="text-xs text-on-surface-variant/60 truncate">
                {p.candidate?.trade_category}{p.candidate?.specific_role ? ` · ${p.candidate.specific_role}` : ''}
                {p.candidate?.nationality ? ` · ${p.candidate.nationality}` : ''}
              </div>
            </div>
            <select value={p.stage} onChange={(e) => onMove(p.id, e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-2 py-1 text-on-surface text-xs flex-none">
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
            <button onClick={() => onRemove(p.id)} className="text-xs text-on-surface-variant/40 hover:text-red-400 flex-none" title="Remove">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
