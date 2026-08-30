import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { logError } from '@/lib/logError'

const ACTIVE = ['planning', 'tendering', 'awarded', 'in_progress', 'on_hold']

/** GET /api/construction/overview — KPIs for the construction dashboard */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const db = access.supabase
    const soon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    const count = (q: any) => q.select('*', { count: 'exact', head: true })

    const [active, inProgress, completed, dueSoon, overdue, rows] = await Promise.all([
      count(db.from('construction_projects')).in('status', ACTIVE),
      count(db.from('construction_projects')).eq('status', 'in_progress'),
      count(db.from('construction_projects')).in('status', ['completed', 'handover']),
      count(db.from('construction_projects')).in('status', ACTIVE).not('target_completion', 'is', null).lte('target_completion', soon).gte('target_completion', today),
      count(db.from('construction_projects')).in('status', ACTIVE).not('target_completion', 'is', null).lt('target_completion', today),
      db.from('construction_projects').select('status, contract_value, progress_pct').in('status', ACTIVE),
    ])

    const active_rows = rows.data || []
    const contractValueActive = Math.round(active_rows.reduce((s: number, r: any) => s + (Number(r.contract_value) || 0), 0))
    const avgProgress = active_rows.length
      ? Math.round(active_rows.reduce((s: number, r: any) => s + (r.progress_pct || 0), 0) / active_rows.length)
      : 0

    return NextResponse.json({
      activeProjects: active.count ?? 0,
      inProgress: inProgress.count ?? 0,
      completed: completed.count ?? 0,
      dueSoon: dueSoon.count ?? 0,
      overdue: overdue.count ?? 0,
      contractValueActive,
      avgProgress,
    })
  } catch (err) {
    logError('api.construction.overview.get', err)
    return NextResponse.json({ error: 'Could not load the construction overview.' }, { status: 500 })
  }
}
