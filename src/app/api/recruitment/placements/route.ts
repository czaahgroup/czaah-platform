import { NextRequest, NextResponse } from 'next/server'
import { requireRecruitAccess } from '@/lib/recruitAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const STAGES = ['sourced', 'shortlisted', 'interview', 'selected', 'offer', 'medical', 'visa', 'ticketing', 'deployed', 'rejected', 'withdrawn']

/** POST /api/recruitment/placements  — add a candidate to a job order */
export async function POST(request: NextRequest) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const jobOrderId = b.jobOrderId
    const candidateId = b.candidateId
    if (!jobOrderId || !candidateId) return NextResponse.json({ error: 'jobOrderId and candidateId are required.' }, { status: 400 })

    const { data: order } = await access.supabase.from('recruitment_job_orders').select('id, title').eq('id', jobOrderId).maybeSingle()
    if (!order) return NextResponse.json({ error: 'Job order not found.' }, { status: 404 })
    const { data: cand } = await access.supabase.from('workforce_registry').select('id, full_name').eq('id', candidateId).maybeSingle()
    if (!cand) return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 })

    const { data: existing } = await access.supabase.from('recruitment_placements').select('id').eq('job_order_id', jobOrderId).eq('candidate_id', candidateId).maybeSingle()
    if (existing) return NextResponse.json({ error: `${cand.full_name} is already on this order.`, existingId: existing.id }, { status: 409 })

    const row = {
      job_order_id: jobOrderId,
      candidate_id: candidateId,
      stage: STAGES.includes(b.stage) ? b.stage : 'sourced',
      notes: b.notes ? String(b.notes).slice(0, 4000) : null,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('recruitment_placements').insert(row).select('id').single()
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'placement.created', targetType: 'job_order', targetId: jobOrderId, metadata: { placementId: data.id, candidate: cand.full_name } })
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.recruitment.placements.post', err)
    return NextResponse.json({ error: 'Could not add the candidate.' }, { status: 500 })
  }
}

/** PATCH /api/recruitment/placements?id=<uuid>  — stage / notes / offered salary */
export async function PATCH(request: NextRequest) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })
    const { data: pl } = await access.supabase.from('recruitment_placements').select('id, job_order_id, stage').eq('id', id).maybeSingle()
    if (!pl) return NextResponse.json({ error: 'Placement not found.' }, { status: 404 })

    const b = await request.json().catch(() => ({}))
    const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
    const patch: Record<string, unknown> = {}
    if (STAGES.includes(b.stage)) patch.stage = b.stage
    if ('notes' in b) patch.notes = b.notes ? String(b.notes).slice(0, 4000) : null
    if ('offeredSalary' in b) patch.offered_salary = num(b.offeredSalary)
    if ('offeredCurrency' in b) patch.offered_currency = b.offeredCurrency ? String(b.offeredCurrency).toUpperCase().slice(0, 3) : null
    if ('deployedAt' in b) patch.deployed_at = b.deployedAt || null
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('recruitment_placements').update(patch).eq('id', id)
    if (error) throw error
    if (patch.stage && patch.stage !== pl.stage) {
      await logActivity({ actorId: access.userId, action: 'placement.stage_changed', targetType: 'job_order', targetId: pl.job_order_id, metadata: { placementId: id, from: pl.stage, to: patch.stage } })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.recruitment.placements.patch', err)
    return NextResponse.json({ error: 'Could not update the placement.' }, { status: 500 })
  }
}

/** DELETE /api/recruitment/placements?id=<uuid> */
export async function DELETE(request: NextRequest) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })
    const { data: pl } = await access.supabase.from('recruitment_placements').select('job_order_id').eq('id', id).maybeSingle()
    const { error } = await access.supabase.from('recruitment_placements').delete().eq('id', id)
    if (error) throw error
    if (pl) await logActivity({ actorId: access.userId, action: 'placement.removed', targetType: 'job_order', targetId: pl.job_order_id, metadata: { placementId: id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.recruitment.placements.delete', err)
    return NextResponse.json({ error: 'Could not remove the placement.' }, { status: 500 })
  }
}
