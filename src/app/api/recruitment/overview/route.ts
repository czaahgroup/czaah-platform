import { NextRequest, NextResponse } from 'next/server'
import { requireRecruitAccess } from '@/lib/recruitAuth'
import { logError } from '@/lib/logError'

const OPEN = ['open', 'partially_filled']

/** GET /api/recruitment/overview — KPIs for the recruitment dashboard */
export async function GET(request: NextRequest) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  try {
    const db = access.supabase
    const now = new Date()
    const thirtyAgo = new Date(now.getTime() - 30 * 864e5).toISOString()
    const count = (q: any) => q.select('*', { count: 'exact', head: true })

    const [openOrders, filledOrders, candidates, deployed30, orderRows, placementRows] = await Promise.all([
      count(db.from('recruitment_job_orders')).in('status', OPEN),
      count(db.from('recruitment_job_orders')).eq('status', 'filled'),
      count(db.from('workforce_registry')),
      count(db.from('recruitment_placements')).eq('stage', 'deployed').gte('stage_changed_at', thirtyAgo),
      db.from('recruitment_job_orders').select('headcount, status').in('status', [...OPEN, 'filled', 'on_hold']),
      db.from('recruitment_placements').select('stage'),
    ])

    const openSeats = (orderRows.data || [])
      .filter((o: any) => OPEN.includes(o.status))
      .reduce((s: number, o: any) => s + (o.headcount || 0), 0)

    const byStage: Record<string, number> = {}
    for (const p of placementRows.data || []) byStage[p.stage] = (byStage[p.stage] || 0) + 1

    const activePipeline = Object.entries(byStage)
      .filter(([k]) => !['deployed', 'rejected', 'withdrawn'].includes(k))
      .reduce((s, [, v]) => s + v, 0)

    return NextResponse.json({
      openOrders: openOrders.count ?? 0,
      filledOrders: filledOrders.count ?? 0,
      openSeats,
      candidates: candidates.count ?? 0,
      deployedLast30d: deployed30.count ?? 0,
      activePipeline,
      byStage,
    })
  } catch (err) {
    logError('api.recruitment.overview.get', err)
    return NextResponse.json({ error: 'Could not load the recruitment overview.' }, { status: 500 })
  }
}
