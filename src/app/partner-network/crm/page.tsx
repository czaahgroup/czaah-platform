'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'

/**
 * Partner CRM — the same /api/crm/* endpoints as the admin workspace, which
 * scope every query to `owner_id / created_by / assignee_id = this partner`.
 * A partner never sees another partner's records.
 */
export default function PartnerCrmPage() {
  const [tab, setTab] = useState<'contacts' | 'tasks'>('contacts')
  const [contacts, setContacts] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cName, setCName] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [tTitle, setTTitle] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, t] = await Promise.all([
        fetch('/api/crm/contacts').then((r) => r.json()),
        fetch('/api/crm/tasks?view=mine').then((r) => r.json()),
      ])
      if (c.error) throw new Error(c.error)
      setContacts(c.data || [])
      setTasks(t.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function addContact() {
    if (!cName.trim()) return
    const res = await fetch('/api/crm/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cName, email: cEmail || undefined }),
    })
    if (res.ok) { setCName(''); setCEmail(''); await load() }
    else setError((await res.json()).error || 'Could not add contact')
  }
  async function addTask() {
    if (!tTitle.trim()) return
    const res = await fetch('/api/crm/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: tTitle }),
    })
    if (res.ok) { setTTitle(''); await load() }
  }
  async function toggleTask(id: string, status: string) {
    await fetch(`/api/crm/tasks?taskId=${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }

  const input = 'bg-surface-container-lowest border border-outline-variant/10 px-3 py-2 text-on-surface text-sm'

  return (
    <div className="max-w-2xl">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-1">My CRM</h1>
      <p className="text-sm text-on-surface-variant mb-6">Your contacts and follow-ups.</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 mb-4 text-sm text-red-400">{error}</div>}

      <div className="flex gap-1 border-b border-outline-variant/10 mb-5">
        {(['contacts', 'tasks'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm capitalize border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            {t} ({t === 'contacts' ? contacts.length : tasks.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : tab === 'contacts' ? (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Name" className={`${input} flex-1 min-w-[140px]`} />
            <input value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="Email (optional)" className={`${input} flex-1 min-w-[140px]`} />
            <button onClick={addContact} disabled={!cName.trim()} className="bg-primary text-on-primary font-semibold px-4 py-2 text-sm disabled:opacity-40">Add</button>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {contacts.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">No contacts yet.</p>}
            {contacts.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <p className="text-sm text-on-surface">{c.name}</p>
                <p className="text-[11px] text-on-surface-variant/60">
                  {[c.email, c.company?.name, c.type].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 mb-4">
            <input value={tTitle} onChange={(e) => setTTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
              placeholder="Add a task…" className={`${input} flex-1`} />
            <button onClick={addTask} disabled={!tTitle.trim()} className="bg-primary text-on-primary font-semibold px-4 py-2 text-sm disabled:opacity-40">Add</button>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
            {tasks.length === 0 && <p className="text-on-surface-variant/60 text-sm text-center py-8">Nothing on your list.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                <button onClick={() => toggleTask(t.id, t.status === 'done' ? 'open' : 'done')}
                  className={`mt-0.5 w-4 h-4 flex-none border ${t.status === 'done' ? 'bg-primary border-primary' : 'border-outline-variant/40 hover:border-primary'}`}>
                  {t.status === 'done' && <span className="text-on-primary text-[10px] leading-none block">✓</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${t.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`}>{t.title}</p>
                  {t.due_at && <p className="text-[11px] text-on-surface-variant/50 mt-0.5">due {new Date(t.due_at).toLocaleDateString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
