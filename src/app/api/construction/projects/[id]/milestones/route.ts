import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const MS_STATUS = ['pending', 'in_progress', 'done', 'blocked', 'skipped']

async function projectVisible(access: any, id: string) {
  let q = access.supabase.from('construction_projects').select('id').eq('id', id)
  q = scopeQuery(q, access)
  const { data } = await q.maybeSingle()
  return !!data
}

/** POST /api/construction/projects/[id]/milestones */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await projectVisible(access, id))) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    const b = await request.json().catch(() => ({}))
    const name = String(b.name || '').trim()
    if (!name) return NextResponse.json({ error: 'A milestone name is required.' }, { status: 400 })

    const { count } = await access.supabase.from('construction_milestones').select('*', { count: 'exact', head: true }).eq('project_id', id)
    const row = {
      project_id: id,
      name: name.slice(0, 200),
      status: MS_STATUS.includes(b.status) ? b.status : 'pending',
      weight: b.weight ? Math.max(1, Math.min(1000, parseInt(b.weight, 10) || 1)) : 1,
      sort_order: b.sortOrder != null ? parseInt(b.sortOrder, 10) || 0 : (count ?? 0),
      target_date: b.targetDate || null,
      note: b.note ? String(b.note).slice(0, 2000) : null,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('construction_milestones').insert(row).select('id').single()
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'construction_project.milestone_added', targetType: 'construction_project', targetId: id, metadata: { milestoneId: data.id, name } })
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.construction.milestones.post', err)
    return NextResponse.json({ error: 'Could not add the milestone.' }, { status: 500 })
  }
}

/** PATCH /api/construction/projects/[id]/milestones?milestoneId=<uuid> */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await projectVisible(access, id))) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    const milestoneId = request.nextUrl.searchParams.get('milestoneId')
    if (!milestoneId) return NextResponse.json({ error: 'milestoneId is required.' }, { status: 400 })

    const b = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}
    if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim().slice(0, 200)
    if (MS_STATUS.includes(b.status)) {
      patch.status = b.status
      patch.done_date = b.status === 'done' ? new Date().toISOString().slice(0, 10) : null
    }
    if ('weight' in b) patch.weight = Math.max(1, Math.min(1000, parseInt(b.weight, 10) || 1))
    if ('sortOrder' in b) patch.sort_order = parseInt(b.sortOrder, 10) || 0
    if ('targetDate' in b) patch.target_date = b.targetDate || null
    if ('note' in b) patch.note = b.note ? String(b.note).slice(0, 2000) : null
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('construction_milestones').update(patch).eq('id', milestoneId).eq('project_id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.construction.milestones.patch', err)
    return NextResponse.json({ error: 'Could not update the milestone.' }, { status: 500 })
  }
}

/** DELETE /api/construction/projects/[id]/milestones?milestoneId=<uuid> */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await projectVisible(access, id))) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    const milestoneId = request.nextUrl.searchParams.get('milestoneId')
    if (!milestoneId) return NextResponse.json({ error: 'milestoneId is required.' }, { status: 400 })
    const { error } = await access.supabase.from('construction_milestones').delete().eq('id', milestoneId).eq('project_id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.construction.milestones.delete', err)
    return NextResponse.json({ error: 'Could not delete the milestone.' }, { status: 500 })
  }
}
