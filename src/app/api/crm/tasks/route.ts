import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const STATUS = ['open', 'done', 'cancelled']
const PRIORITY = ['low', 'normal', 'high', 'urgent']
const OBJECTS = ['contact', 'company', 'enquiry', 'partner_opportunity', 'investment_opportunity', 'mail_thread']
const PAGE = 100

/**
 * GET /api/crm/tasks
 *   ?view=mine|today|overdue|all   (default: mine)
 *   &status=open|done|cancelled
 *   &type=<object>&id=<uuid>       (tasks on a specific record)
 */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const p = request.nextUrl.searchParams
    const view = p.get('view') || 'mine'
    const status = p.get('status')
    const relType = p.get('type')
    const relId = p.get('id')

    let q = access.supabase
      .from('crm_tasks')
      .select('id, title, description, status, priority, due_at, related_type, related_id, completed_at, created_at, assignee:profiles!crm_tasks_assignee_id_fkey(id, full_name), creator:profiles!crm_tasks_created_by_fkey(id, full_name)')
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(PAGE)

    q = scopeQuery(q, access, ['assignee_id', 'created_by'])

    if (relType && OBJECTS.includes(relType) && relId) {
      q = q.eq('related_type', relType).eq('related_id', relId)
    } else {
      if (view === 'mine') q = q.eq('assignee_id', access.userId).eq('status', 'open')
      else if (view === 'today') {
        const end = new Date(); end.setHours(23, 59, 59, 999)
        q = q.eq('assignee_id', access.userId).eq('status', 'open').lte('due_at', end.toISOString())
      } else if (view === 'overdue') {
        q = q.eq('assignee_id', access.userId).eq('status', 'open').lt('due_at', new Date().toISOString())
      }
      if (status && STATUS.includes(status)) q = q.eq('status', status)
    }

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err) {
    logError('api.crm.tasks.get', err)
    return NextResponse.json({ error: 'Could not load tasks.' }, { status: 500 })
  }
}

/** POST /api/crm/tasks */
export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const title = String(b.title || '').trim()
    if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 })

    const relType = OBJECTS.includes(b.relatedType) ? b.relatedType : null
    const relId = relType && b.relatedId ? b.relatedId : null
    if ((relType && !relId) || (!relType && relId)) {
      return NextResponse.json({ error: 'relatedType and relatedId must be set together.' }, { status: 400 })
    }

    const dueAt = b.dueAt ? new Date(b.dueAt) : null
    const row = {
      title: title.slice(0, 500),
      description: b.description ? String(b.description).slice(0, 5000) : null,
      priority: PRIORITY.includes(b.priority) ? b.priority : 'normal',
      due_at: dueAt && !isNaN(dueAt.getTime()) ? dueAt.toISOString() : null,
      reminder_at: b.reminderAt && !isNaN(new Date(b.reminderAt).getTime()) ? new Date(b.reminderAt).toISOString() : null,
      assignee_id: b.assigneeId || access.userId,
      related_type: relType,
      related_id: relId,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('crm_tasks').insert(row).select('id').single()
    if (error) throw error

    await logActivity({
      actorId: access.userId, action: 'task.created',
      targetType: relType || 'task', targetId: relId || data.id,
      metadata: { taskId: data.id, title, assignee_id: row.assignee_id },
    })
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.crm.tasks.post', err)
    return NextResponse.json({ error: 'Could not create the task.' }, { status: 500 })
  }
}

/** PATCH /api/crm/tasks?taskId=<uuid>  — status / assignee / due / priority / title */
export async function PATCH(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const taskId = request.nextUrl.searchParams.get('taskId')
    if (!taskId) return NextResponse.json({ error: 'taskId is required.' }, { status: 400 })

    let check = access.supabase.from('crm_tasks').select('id, related_type, related_id, status').eq('id', taskId)
    check = scopeQuery(check, access, ['assignee_id', 'created_by'])
    const { data: task } = await check.maybeSingle()
    if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

    const b = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}
    if (typeof b.title === 'string' && b.title.trim()) patch.title = b.title.trim().slice(0, 500)
    if ('description' in b) patch.description = b.description ? String(b.description).slice(0, 5000) : null
    if (PRIORITY.includes(b.priority)) patch.priority = b.priority
    if ('dueAt' in b) {
      const d = b.dueAt ? new Date(b.dueAt) : null
      patch.due_at = d && !isNaN(d.getTime()) ? d.toISOString() : null
    }
    if ('assigneeId' in b) patch.assignee_id = b.assigneeId || null
    if (STATUS.includes(b.status)) {
      patch.status = b.status
      patch.completed_at = b.status === 'done' ? new Date().toISOString() : null
    }
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('crm_tasks').update(patch).eq('id', taskId)
    if (error) throw error

    if (patch.status) {
      await logActivity({
        actorId: access.userId, action: patch.status === 'done' ? 'task.completed' : `task.${patch.status}`,
        targetType: task.related_type || 'task', targetId: task.related_id || taskId,
        metadata: { taskId },
      })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.crm.tasks.patch', err)
    return NextResponse.json({ error: 'Could not update the task.' }, { status: 500 })
  }
}

/** DELETE /api/crm/tasks?taskId=<uuid> */
export async function DELETE(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const taskId = request.nextUrl.searchParams.get('taskId')
    if (!taskId) return NextResponse.json({ error: 'taskId is required.' }, { status: 400 })
    let check = access.supabase.from('crm_tasks').select('id').eq('id', taskId)
    check = scopeQuery(check, access, ['assignee_id', 'created_by'])
    const { data: task } = await check.maybeSingle()
    if (!task && access.role !== 'super_admin') return NextResponse.json({ error: 'Task not found.' }, { status: 404 })
    const { error } = await access.supabase.from('crm_tasks').delete().eq('id', taskId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.crm.tasks.delete', err)
    return NextResponse.json({ error: 'Could not delete the task.' }, { status: 500 })
  }
}
