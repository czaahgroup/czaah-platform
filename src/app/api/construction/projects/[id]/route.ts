import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const TYPES = ['residential', 'commercial', 'industrial', 'infrastructure', 'mixed_use', 'fit_out', 'other']
const STATUS = ['planning', 'tendering', 'awarded', 'in_progress', 'on_hold', 'completed', 'handover', 'cancelled']

async function loadScoped(access: any, id: string) {
  let q = access.supabase
    .from('construction_projects')
    .select('*, client:crm_companies(id, name), deal:deals(id, reference, title), owner:profiles!construction_projects_owner_id_fkey(id, full_name)')
    .eq('id', id)
  q = scopeQuery(q, access)
  const { data } = await q.maybeSingle()
  return data
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    const project = await loadScoped(access, id)
    if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

    const [{ data: milestones }, { data: updates }] = await Promise.all([
      access.supabase.from('construction_milestones').select('*').eq('project_id', id).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      access.supabase.from('construction_updates').select('id, report_date, progress_pct, headline, body, created_at, author:profiles!construction_updates_created_by_fkey(id, full_name)').eq('project_id', id).order('report_date', { ascending: false }).limit(50),
    ])
    return NextResponse.json({ data: { ...project, milestones: milestones || [], updates: updates || [] } })
  } catch (err) {
    logError('api.construction.projects.id.get', err)
    return NextResponse.json({ error: 'Could not load the project.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    const before = await loadScoped(access, id)
    if (!before) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

    const b = await request.json().catch(() => ({}))
    const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
    const patch: Record<string, unknown> = {}
    if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim().slice(0, 300)
    if (TYPES.includes(b.projectType)) patch.project_type = b.projectType
    if (STATUS.includes(b.status)) patch.status = b.status
    if ('clientCompanyId' in b) patch.client_company_id = b.clientCompanyId || null
    if ('dealId' in b) patch.deal_id = b.dealId || null
    if ('siteLocation' in b) patch.site_location = b.siteLocation ? String(b.siteLocation).slice(0, 300) : null
    if ('country' in b) patch.country = b.country ? String(b.country).toUpperCase().slice(0, 2) : null
    if ('contractValue' in b) patch.contract_value = num(b.contractValue)
    if ('budget' in b) patch.budget = num(b.budget)
    if ('currency' in b) patch.currency = b.currency ? String(b.currency).toUpperCase().slice(0, 3) : null
    if ('progressPct' in b && !isNaN(Number(b.progressPct))) patch.progress_pct = Math.max(0, Math.min(100, Math.round(Number(b.progressPct))))
    if ('startDate' in b) patch.start_date = b.startDate || null
    if ('targetCompletion' in b) patch.target_completion = b.targetCompletion || null
    if ('actualCompletion' in b) patch.actual_completion = b.actualCompletion || null
    if ('description' in b) patch.description = b.description ? String(b.description).slice(0, 8000) : null
    if ('ownerId' in b && access.scope === 'all') patch.owner_id = b.ownerId || null
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('construction_projects').update(patch).eq('id', id)
    if (error) throw error
    await logActivity({
      actorId: access.userId,
      action: patch.status && patch.status !== before.status ? 'construction_project.status_changed' : 'construction_project.updated',
      targetType: 'construction_project', targetId: id, metadata: { fields: Object.keys(patch) },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.construction.projects.id.patch', err)
    return NextResponse.json({ error: 'Could not update the project.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.role !== 'super_admin') return NextResponse.json({ error: 'Only a super admin can delete a project.' }, { status: 403 })
  try {
    const { id } = await params
    const { error } = await access.supabase.from('construction_projects').delete().eq('id', id)
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'construction_project.deleted', targetType: 'construction_project', targetId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.construction.projects.id.delete', err)
    return NextResponse.json({ error: 'Could not delete the project.' }, { status: 500 })
  }
}
