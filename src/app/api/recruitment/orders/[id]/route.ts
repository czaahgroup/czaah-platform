import { NextRequest, NextResponse } from 'next/server'
import { requireRecruitAccess } from '@/lib/recruitAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const ORDER_STATUS = ['draft', 'open', 'partially_filled', 'filled', 'on_hold', 'closed', 'cancelled']

async function loadOrder(supabase: any, id: string) {
  const { data } = await supabase
    .from('recruitment_job_orders')
    .select('*, employer:employer_registry(id, company_name, contact_person, email), oep:oep_registry(id, company_name), company:crm_companies(id, name), owner:profiles!recruitment_job_orders_owner_id_fkey(id, full_name)')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    const order = await loadOrder(access.supabase, id)
    if (!order) return NextResponse.json({ error: 'Job order not found.' }, { status: 404 })

    const { data: placements } = await access.supabase
      .from('recruitment_placements')
      .select('id, stage, stage_changed_at, deployed_at, offered_salary, offered_currency, notes, created_at, candidate:workforce_registry(id, full_name, nationality, trade_category, specific_role, years_experience, phone, email, availability)')
      .eq('job_order_id', id)
      .order('stage_changed_at', { ascending: false })

    return NextResponse.json({ data: { ...order, placements: placements || [] } })
  } catch (err) {
    logError('api.recruitment.orders.id.get', err)
    return NextResponse.json({ error: 'Could not load the job order.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await loadOrder(access.supabase, id))) return NextResponse.json({ error: 'Job order not found.' }, { status: 404 })

    const b = await request.json().catch(() => ({}))
    const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
    const patch: Record<string, unknown> = {}
    if (typeof b.title === 'string' && b.title.trim()) patch.title = b.title.trim().slice(0, 300)
    if (typeof b.tradeCategory === 'string' && b.tradeCategory.trim()) patch.trade_category = b.tradeCategory.trim().slice(0, 120)
    if ('specificRole' in b) patch.specific_role = b.specificRole ? String(b.specificRole).slice(0, 200) : null
    if ('destinationCountry' in b) patch.destination_country = b.destinationCountry ? String(b.destinationCountry).toUpperCase().slice(0, 2) : null
    if ('headcount' in b) patch.headcount = Math.max(1, Math.min(100000, parseInt(b.headcount, 10) || 1))
    if ('salaryMin' in b) patch.salary_min = num(b.salaryMin)
    if ('salaryMax' in b) patch.salary_max = num(b.salaryMax)
    if ('salaryCurrency' in b) patch.salary_currency = b.salaryCurrency ? String(b.salaryCurrency).toUpperCase().slice(0, 3) : null
    if ('contractMonths' in b) patch.contract_months = b.contractMonths ? Math.max(0, parseInt(b.contractMonths, 10) || 0) : null
    if ('requirements' in b) patch.requirements = b.requirements ? String(b.requirements).slice(0, 8000) : null
    if ('targetDate' in b) patch.target_date = b.targetDate || null
    if ('employerId' in b) patch.employer_id = b.employerId || null
    if ('oepId' in b) patch.oep_id = b.oepId || null
    if ('companyId' in b) patch.company_id = b.companyId || null
    if ('ownerId' in b) patch.owner_id = b.ownerId || null
    if (ORDER_STATUS.includes(b.status)) patch.status = b.status
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('recruitment_job_orders').update(patch).eq('id', id)
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'job_order.updated', targetType: 'job_order', targetId: id, metadata: { fields: Object.keys(patch) } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.recruitment.orders.id.patch', err)
    return NextResponse.json({ error: 'Could not update the job order.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  if (access.role !== 'super_admin') return NextResponse.json({ error: 'Only a super admin can delete a job order.' }, { status: 403 })
  try {
    const { id } = await params
    const { error } = await access.supabase.from('recruitment_job_orders').delete().eq('id', id)
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'job_order.deleted', targetType: 'job_order', targetId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.recruitment.orders.id.delete', err)
    return NextResponse.json({ error: 'Could not delete the job order.' }, { status: 500 })
  }
}
