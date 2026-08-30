'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'

const STAGES = ['new', 'engaged', 'qualified', 'active', 'dormant', 'lost']

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [co, setCo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<any>({})
  const [saving, setSaving] = useState(false)

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
        description: j.data.description || '',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

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
          <div className="flex items-center gap-2 mt-1.5 text-xs text-on-surface-variant/70">
            {co.domain && <span className="font-mono">{co.domain}</span>}
            {co.sector?.name && <><span className="text-on-surface-variant/30">·</span><span>{co.sector.name}</span></>}
            <span className="text-on-surface-variant/30">·</span><span>{co.stage}</span>
          </div>
        </div>
        {!edit && <button onClick={() => setEdit(true)} className="text-xs text-primary border border-outline-variant/30 hover:border-primary/50 px-3 py-1.5 transition-colors">Edit</button>}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 mb-4 text-sm text-red-400">{error}</div>}

      <div className="bg-surface-container-low border border-outline-variant/10 p-5 mb-6">
        {edit ? (
          <div className="space-y-3">
            {[['name', 'Name'], ['domain', 'Domain'], ['website', 'Website'], ['country', 'Country'], ['companySize', 'Size']].map(([k, label]) => (
              <div key={k}>
                <label className="block text-xs text-on-surface-variant mb-1">{label}</label>
                <input value={draft[k]} onChange={(e) => setDraft((d: any) => ({ ...d, [k]: e.target.value }))} className={field} />
              </div>
            ))}
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Stage</label>
              <select value={draft.stage} onChange={(e) => setDraft((d: any) => ({ ...d, stage: e.target.value }))} className={field}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
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
            <dt className="text-on-surface-variant/60">Website</dt><dd className="text-on-surface">{co.website || '—'}</dd>
            <dt className="text-on-surface-variant/60">Country</dt><dd className="text-on-surface">{co.country || '—'}</dd>
            <dt className="text-on-surface-variant/60">Size</dt><dd className="text-on-surface">{co.company_size || '—'}</dd>
            <dt className="text-on-surface-variant/60">Owner</dt><dd className="text-on-surface">{co.owner?.full_name || '—'}</dd>
            {co.description && <><dt className="text-on-surface-variant/60">About</dt><dd className="text-on-surface whitespace-pre-wrap">{co.description}</dd></>}
          </dl>
        )}
      </div>

      <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Contacts ({co.contacts?.length || 0})</h2>
      {co.contacts?.length ? (
        <div className="bg-surface-container-low border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {co.contacts.map((c: any) => (
                <tr key={c.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest/40">
                  <td className="px-5 py-3">
                    <Link href={`/admin/crm/contacts/${c.id}`} className="text-on-surface hover:text-primary">{c.name}</Link>
                    {c.email && <span className="text-on-surface-variant/50 text-xs font-mono ml-2">{c.email}</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-on-surface-variant uppercase tracking-wide">{c.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-on-surface-variant/60 text-sm">No contacts linked to this company.</p>
      )}
    </div>
  )
}
