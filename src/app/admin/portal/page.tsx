'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'

const TYPE_LABEL: Record<string, string> = {
  deal: 'Deal', construction_project: 'Project', commodity_trade: 'Trade',
}

export default function PortalAdminPage() {
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [members, setMembers] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [memberId, setMemberId] = useState('')
  const [resource, setResource] = useState('')
  const [canDocs, setCanDocs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [resType, setResType] = useState('deal')
  const [resId, setResId] = useState('')
  const [shares, setShares] = useState<any[]>([])

  useEffect(() => { const t = setTimeout(() => setQd(q.trim()), 300); return () => clearTimeout(t) }, [q])

  const loadPicker = useCallback(async () => {
    const res = await fetch(`/api/admin/portal-shares?q=${encodeURIComponent(qd)}`)
    if (res.ok) { const j = await res.json(); setMembers(j.members || []); setResources(j.resources || []) }
  }, [qd])
  useEffect(() => { loadPicker() }, [loadPicker])

  const loadShares = useCallback(async () => {
    if (!resId) { setShares([]); return }
    const res = await fetch(`/api/admin/portal-shares?resource=${resType}&id=${resId}`)
    if (res.ok) setShares((await res.json()).data || [])
  }, [resType, resId])
  useEffect(() => { loadShares() }, [loadShares])

  async function grant() {
    setError(null); setOk(null)
    if (!memberId || !resource) { setError('Pick a client and a resource.'); return }
    const [rt, ri] = resource.split('::')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/portal-shares', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: memberId, resourceType: rt, resourceId: ri, canViewDocuments: canDocs }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not share')
      setOk('Shared.'); setMemberId(''); setResource('')
      if (rt === resType && ri === resId) await loadShares()
    } catch (e: any) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  async function revoke(shareId: string) {
    await fetch(`/api/admin/portal-shares?shareId=${shareId}`, { method: 'DELETE' })
    await loadShares()
  }

  const sel = 'bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface text-sm w-full'

  return (
    <div className="max-w-3xl">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-1">Client Portal Access</h1>
      <p className="text-sm text-on-surface-variant mb-6">Grant a client read-only access to a deal, project or trade in their <span className="font-mono">/dashboard/portfolio</span>.</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4 text-sm text-red-400">{error}</div>}
      {ok && <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 mb-4 text-sm text-emerald-400">{ok}</div>}

      <div className="bg-surface-container-low border border-outline-variant/10 p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Grant access</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter clients & resources…" className={`${sel} mb-3`} />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Client</label>
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={sel}>
              <option value="">— pick a client —</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}{m.email ? ` (${m.email})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Resource</label>
            <select value={resource} onChange={(e) => setResource(e.target.value)} className={sel}>
              <option value="">— pick a resource —</option>
              {resources.map((r) => <option key={`${r.type}::${r.id}`} value={`${r.type}::${r.id}`}>{TYPE_LABEL[r.type]}: {r.label}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 text-sm text-on-surface-variant">
          <input type="checkbox" checked={canDocs} onChange={(e) => setCanDocs(e.target.checked)} />
          Client can view documents attached to this resource
        </label>
        <div className="flex justify-end mt-4">
          <button onClick={grant} disabled={saving} className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm disabled:opacity-50">{saving ? 'Sharing…' : 'Grant access'}</button>
        </div>
      </div>

      <div className="bg-surface-container-low border border-outline-variant/10 p-5">
        <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Who can see a resource</h2>
        <div className="flex gap-2 mb-4">
          <select value={resType} onChange={(e) => setResType(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm">
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={resId} onChange={(e) => setResId(e.target.value)} className="flex-1 bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm">
            <option value="">— pick a {TYPE_LABEL[resType].toLowerCase()} —</option>
            {resources.filter((r) => r.type === resType).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        {resId && (
          <div className="divide-y divide-outline-variant/10 border border-outline-variant/10">
            {shares.length === 0 && <p className="text-on-surface-variant/50 text-sm text-center py-6">Not shared with anyone.</p>}
            {shares.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-on-surface">{s.profile?.full_name || '—'}</div>
                  <div className="text-[11px] text-on-surface-variant/50">{s.profile?.email}{s.can_view_documents ? ' · documents' : ' · summary only'}</div>
                </div>
                <button onClick={() => revoke(s.id)} className="text-xs text-red-400 hover:text-red-300 flex-none">Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
