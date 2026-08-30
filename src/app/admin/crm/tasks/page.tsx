'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'

const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'text-red-400', high: 'text-amber-400', normal: 'text-on-surface-variant/60', low: 'text-on-surface-variant/40',
}

function bucket(t: any): string {
  if (!t.due_at) return 'No date'
  const d = new Date(t.due_at)
  const now = new Date()
  const eod = new Date(); eod.setHours(23, 59, 59, 999)
  if (d < now) return 'Overdue'
  if (d <= eod) return 'Today'
  const week = new Date(); week.setDate(week.getDate() + 7)
  if (d <= week) return 'This week'
  return 'Later'
}
const ORDER = ['Overdue', 'Today', 'This week', 'Later', 'No date']

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'mine' | 'all'>('mine')
  const [showDone, setShowDone] = useState(false)

  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/tasks?view=${view === 'all' ? 'all' : 'mine'}${showDone ? '&status=done' : ''}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load')
      setTasks(j.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally { setLoading(false) }
  }, [view, showDone])

  useEffect(() => { load() }, [load])

  async function add() {
    if (!title.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/crm/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, dueAt: due || null }),
      })
      if (res.ok) { setTitle(''); setDue(''); await load() }
    } finally { setAdding(false) }
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/crm/tasks?taskId=${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    await load()
  }

  const groups: Record<string, any[]> = {}
  for (const t of tasks) (groups[bucket(t)] ||= []).push(t)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Tasks</h1>
        <div className="flex gap-1 text-xs">
          {(['mine', 'all'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 capitalize border ${view === v ? 'border-primary text-primary' : 'border-outline-variant/20 text-on-surface-variant'}`}>{v}</button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-on-surface-variant mb-5 cursor-pointer">
        <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-primary" />
        Show completed
      </label>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 mb-4 text-sm text-red-400">{error}</div>}

      <div className="flex gap-2 mb-6">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          placeholder="Add a task…" className="flex-1 bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface text-sm" />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
          className="bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface text-sm" />
        <button onClick={add} disabled={adding || !title.trim()} className="bg-primary text-on-primary font-semibold px-4 py-2.5 text-sm disabled:opacity-40">Add</button>
      </div>

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center text-sm">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center text-on-surface-variant text-sm">
          {showDone ? 'No completed tasks.' : 'Nothing on your list. Nice.'}
        </div>
      ) : (
        ORDER.filter((g) => groups[g]?.length).map((g) => (
          <div key={g} className="mb-6">
            <h2 className={`text-xs uppercase tracking-wider mb-2 ${g === 'Overdue' ? 'text-red-400' : 'text-on-surface-variant/50'}`}>{g} ({groups[g].length})</h2>
            <div className="bg-surface-container-low border border-outline-variant/10 divide-y divide-outline-variant/10">
              {groups[g].map((t) => (
                <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                  <button
                    onClick={() => setStatus(t.id, t.status === 'done' ? 'open' : 'done')}
                    className={`mt-0.5 w-4 h-4 flex-none border ${t.status === 'done' ? 'bg-primary border-primary' : 'border-outline-variant/40 hover:border-primary'}`}
                    aria-label="Toggle complete"
                  >{t.status === 'done' && <span className="text-on-primary text-[10px] leading-none block">✓</span>}</button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${t.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`}>{t.title}</p>
                    <p className="text-[11px] text-on-surface-variant/50 mt-0.5">
                      {t.assignee?.full_name || 'Unassigned'}
                      {t.due_at && <> · due {new Date(t.due_at).toLocaleDateString()}</>}
                      {t.priority !== 'normal' && <> · <span className={PRIORITY_STYLE[t.priority]}>{t.priority}</span></>}
                      {t.related_type && <> · on {t.related_type.replace(/_/g, ' ')}</>}
                    </p>
                  </div>
                  {t.status === 'open' && (
                    <button onClick={() => setStatus(t.id, 'cancelled')} className="text-[11px] text-on-surface-variant/40 hover:text-on-surface-variant flex-none">dismiss</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
