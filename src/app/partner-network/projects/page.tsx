'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { publicUrl } from '@/components/PhotoUploader'
import { PROJECT_STATUS_LABEL, type ProjectAction } from '@/lib/partnerDevelopments'

interface Project {
  id: string
  name: string
  slug: string
  developer_name: string | null
  country: string
  city: string
  area: string | null
  currency: string
  status: string
  featured_image: string | null
  unit_count: number
  from_price: number | null
}

interface MyDeveloper {
  id: string
  name: string
  active: boolean
}

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400',
  published: 'bg-green-500/20 text-green-400',
  archived: 'bg-neutral-500/20 text-neutral-400',
}

const CONFIRM: Record<string, string> = {
  withdraw: 'Withdraw this project? It comes off the site straight away. You can send it for approval again later.',
  resubmit: 'Send this project for approval again?',
  edit_live: 'To edit a live project it is taken off the site, and CZAAH approves it again after your changes. Continue?',
  delete: 'Delete this project and its units? This cannot be undone.',
}

const actionClass = 'text-xs raleway-text px-3 py-2 border border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:border-primary/40 transition-colors disabled:opacity-50'
const inputClass = 'bg-surface-container border border-outline-variant/20 px-3 py-2.5 text-base sm:text-sm text-on-surface raleway-text w-full focus:border-primary outline-none transition-colors'

export default function PartnerProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [developers, setDevelopers] = useState<MyDeveloper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [devForm, setDevForm] = useState({ open: false, name: '', website: '', description: '', saving: false })

  const load = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([fetch('/api/partner/developments'), fetch('/api/partner/developers')])
      const pj = await p.json()
      if (!p.ok) throw new Error(pj.error || 'Could not load your projects.')
      setProjects(pj.data || [])
      const dj = await d.json().catch(() => ({}))
      setDevelopers(dj.mine || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your projects.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function act(project: Project, action: ProjectAction | 'delete', done: string) {
    if (!window.confirm(CONFIRM[action])) return
    setBusy(project.id)
    setNotice(null)
    try {
      const res = await fetch(`/api/partner/developments/${project.id}`, action === 'delete'
        ? { method: 'DELETE' }
        : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'That did not work. Please try again.')
      if (action === 'edit_live') {
        router.push(`/partner-network/projects/${project.id}`)
        return
      }
      setNotice(`${project.name}: ${done}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function addDeveloper(e: React.FormEvent) {
    e.preventDefault()
    setDevForm((f) => ({ ...f, saving: true }))
    setNotice(null)
    try {
      const res = await fetch('/api/partner/developers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: devForm.name, website: devForm.website, description: devForm.description }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'The developer could not be added.')
      setNotice(`${json.data?.name || devForm.name}: ${json.message || 'added.'}`)
      setDevForm({ open: false, name: '', website: '', description: '', saving: false })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The developer could not be added.')
      setDevForm((f) => ({ ...f, saving: false }))
    }
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center">Loading your projects…</div>

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h1 className="cinzel-text text-2xl text-on-surface">My Projects</h1>
        <Link href="/partner-network/projects/new" className="text-xs px-4 py-2.5 bg-primary text-on-primary raleway-text font-semibold">+ Add Project</Link>
      </div>
      <p className="text-sm text-on-surface-variant/70 mb-6 max-w-2xl">
        New developments with several plot sizes or home types, each with its own price and payment plan. CZAAH reviews every project before it
        appears on CZAAH Properties. For a single property or plot, use <Link href="/partner-network/properties" className="text-primary hover:underline">My Properties</Link>.
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5"><p className="text-sm text-red-400">{error}</p></div>}
      {notice && <div className="bg-green-500/10 border border-green-500/20 px-4 py-3 mb-5"><p className="text-sm text-green-400">{notice}</p></div>}

      {!error && projects.length === 0 ? (
        <div className="bg-surface-container border border-outline-variant/10 px-6 py-16 text-center">
          <p className="text-on-surface-variant text-sm mb-4">You have not added any projects yet.</p>
          <Link href="/partner-network/projects/new" className="text-sm text-primary hover:underline">Add your first project →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const image = p.featured_image ? publicUrl(p.featured_image) : null
            const waiting = busy === p.id
            return (
              <div key={p.id} className="bg-surface-container border border-outline-variant/10 p-4 sm:p-5">
                <div className="flex gap-4">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="w-20 h-20 sm:w-28 sm:h-24 object-cover shrink-0 bg-surface-container-high" />
                  ) : (
                    <div className="w-20 h-20 sm:w-28 sm:h-24 shrink-0 bg-surface-container-high flex items-center justify-center text-on-surface-variant/30" aria-hidden="true">
                      <span className="material-symbols-outlined">domain</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-on-surface break-words">{p.name}</span>
                      <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_BADGES[p.status] || STATUS_BADGES.archived}`}>{PROJECT_STATUS_LABEL[p.status] || p.status}</span>
                    </div>
                    <div className="text-xs text-on-surface-variant/60">
                      {[p.area, p.city, p.country].filter(Boolean).join(', ')}{p.developer_name ? ` · ${p.developer_name}` : ''}
                    </div>
                    <div className="text-sm text-primary mt-1">
                      {p.unit_count} unit{p.unit_count === 1 ? '' : 's'}
                      {p.from_price ? ` · from ${p.currency} ${Number(p.from_price).toLocaleString('en-GB')}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap mt-4">
                  {p.status === 'published' ? (
                    <>
                      <a href={`https://property.czaah.com/developments/${p.slug}`} target="_blank" rel="noopener noreferrer" className={actionClass}>View on site</a>
                      <button type="button" disabled={waiting} className={actionClass} onClick={() => act(p, 'edit_live', '')}>Edit (needs approval again)</button>
                    </>
                  ) : (
                    <Link href={`/partner-network/projects/${p.id}`} className={actionClass}>Edit</Link>
                  )}
                  {(p.status === 'published' || p.status === 'draft') && (
                    <button type="button" disabled={waiting} className={actionClass} onClick={() => act(p, 'withdraw', 'withdrawn.')}>Withdraw</button>
                  )}
                  {p.status === 'archived' && (
                    <button type="button" disabled={waiting} className={actionClass} onClick={() => act(p, 'resubmit', 'sent for approval.')}>Send for approval</button>
                  )}
                  {p.status !== 'published' && (
                    <button type="button" disabled={waiting} className={`${actionClass} !text-red-400 !border-red-500/30`} onClick={() => act(p, 'delete', 'deleted.')}>Delete</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <h2 className="cinzel-text text-lg text-on-surface">Developers</h2>
          {!devForm.open && (
            <button type="button" className={actionClass} onClick={() => setDevForm((f) => ({ ...f, open: true }))}>+ Add a developer</button>
          )}
        </div>
        <p className="text-sm text-on-surface-variant/70 mb-4 max-w-2xl">
          Developers you add are reviewed by CZAAH before they appear on the site. You can also add one while creating a project.
        </p>

        {devForm.open && (
          <form onSubmit={addDeveloper} className="bg-surface-container border border-primary/30 p-4 sm:p-5 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input aria-label="Developer name" className={inputClass} required maxLength={150} placeholder="Developer name *" value={devForm.name} onChange={(e) => setDevForm((f) => ({ ...f, name: e.target.value }))} />
              <input aria-label="Developer website" className={inputClass} maxLength={300} inputMode="url" placeholder="Website (optional)" value={devForm.website} onChange={(e) => setDevForm((f) => ({ ...f, website: e.target.value }))} />
            </div>
            <textarea aria-label="About the developer" className={`${inputClass} mb-3`} rows={3} maxLength={4000} placeholder="About the developer (optional)" value={devForm.description} onChange={(e) => setDevForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="flex gap-2">
              <button type="submit" disabled={devForm.saving} className="text-xs px-4 py-2.5 bg-primary text-on-primary raleway-text font-semibold disabled:opacity-50">{devForm.saving ? 'Sending…' : 'Send for approval'}</button>
              <button type="button" className={actionClass} onClick={() => setDevForm((f) => ({ ...f, open: false }))}>Cancel</button>
            </div>
          </form>
        )}

        {developers.length === 0 ? (
          <p className="text-sm text-on-surface-variant/50">You have not added any developers.</p>
        ) : (
          <ul className="space-y-2">
            {developers.map((d) => (
              <li key={d.id} className="bg-surface-container border border-outline-variant/10 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-on-surface break-words">{d.name}</span>
                <span className={`text-xs px-2 py-0.5 ${d.active ? STATUS_BADGES.published : STATUS_BADGES.draft}`}>{d.active ? 'On the site' : 'Awaiting approval'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
