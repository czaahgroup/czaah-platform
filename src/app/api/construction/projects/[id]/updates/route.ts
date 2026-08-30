import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

async function projectVisible(access: any, id: string) {
  let q = access.supabase.from('construction_projects').select('id').eq('id', id)
  q = scopeQuery(q, access)
  const { data } = await q.maybeSingle()
  return !!data
}

/** POST /api/construction/projects/[id]/updates — a dated progress report */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await projectVisible(access, id))) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    const b = await request.json().catch(() => ({}))
    const headline = String(b.headline || '').trim()
    if (!headline) return NextResponse.json({ error: 'A headline is required.' }, { status: 400 })

    const pct = b.progressPct != null && !isNaN(Number(b.progressPct)) ? Math.max(0, Math.min(100, Math.round(Number(b.progressPct)))) : null
    const row = {
      project_id: id,
      report_date: b.reportDate || new Date().toISOString().slice(0, 10),
      progress_pct: pct,
      headline: headline.slice(0, 300),
      body: b.body ? String(b.body).slice(0, 8000) : null,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('construction_updates').insert(row).select('id').single()
    if (error) throw error

    // A report can carry the project's headline % when there are no weighted milestones driving it.
    if (pct != null) {
      const { count } = await access.supabase.from('construction_milestones').select('*', { count: 'exact', head: true }).eq('project_id', id)
      if (!count) await access.supabase.from('construction_projects').update({ progress_pct: pct }).eq('id', id)
    }
    await logActivity({ actorId: access.userId, action: 'construction_project.update_posted', targetType: 'construction_project', targetId: id, metadata: { updateId: data.id, headline } })
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.construction.updates.post', err)
    return NextResponse.json({ error: 'Could not post the update.' }, { status: 500 })
  }
}

/** DELETE /api/construction/projects/[id]/updates?updateId=<uuid> */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await projectVisible(access, id))) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    const updateId = request.nextUrl.searchParams.get('updateId')
    if (!updateId) return NextResponse.json({ error: 'updateId is required.' }, { status: 400 })
    const { error } = await access.supabase.from('construction_updates').delete().eq('id', updateId).eq('project_id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.construction.updates.delete', err)
    return NextResponse.json({ error: 'Could not delete the update.' }, { status: 500 })
  }
}
