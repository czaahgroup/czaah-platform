import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const STEP_STATUS = ['pending', 'in_progress', 'done', 'waived', 'blocked']
const PRESETS = ['LOI', 'ICPO', 'FCO', 'Draft SPA', 'SPA signed', 'POP', 'SBLC / LC', 'Inspection (SGS)', 'Nomination', 'Bill of Lading', 'Payment', 'Settlement']

async function tradeVisible(access: any, id: string) {
  let q = access.supabase.from('commodity_trades').select('id').eq('id', id)
  q = scopeQuery(q, access)
  const { data } = await q.maybeSingle()
  return !!data
}

/** POST /api/trading/trades/[id]/steps   body: { name } OR { preset:true } to seed the standard checklist */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await tradeVisible(access, id))) return NextResponse.json({ error: 'Trade not found.' }, { status: 404 })
    const b = await request.json().catch(() => ({}))

    if (b.preset) {
      const { count } = await access.supabase.from('trade_steps').select('*', { count: 'exact', head: true }).eq('trade_id', id)
      if (count) return NextResponse.json({ error: 'This trade already has steps.' }, { status: 409 })
      const rows = PRESETS.map((name, i) => ({ trade_id: id, name, sort_order: i, created_by: access.userId }))
      const { error } = await access.supabase.from('trade_steps').insert(rows)
      if (error) throw error
      await logActivity({ actorId: access.userId, action: 'commodity_trade.checklist_seeded', targetType: 'commodity_trade', targetId: id })
      return NextResponse.json({ success: true, added: rows.length })
    }

    const name = String(b.name || '').trim()
    if (!name) return NextResponse.json({ error: 'A step name is required.' }, { status: 400 })
    const { count } = await access.supabase.from('trade_steps').select('*', { count: 'exact', head: true }).eq('trade_id', id)
    const row = {
      trade_id: id,
      name: name.slice(0, 160),
      status: STEP_STATUS.includes(b.status) ? b.status : 'pending',
      sort_order: b.sortOrder != null ? parseInt(b.sortOrder, 10) || 0 : (count ?? 0),
      due_date: b.dueDate || null,
      note: b.note ? String(b.note).slice(0, 2000) : null,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('trade_steps').insert(row).select('id').single()
    if (error) throw error
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.trading.steps.post', err)
    return NextResponse.json({ error: 'Could not add the step.' }, { status: 500 })
  }
}

/** PATCH /api/trading/trades/[id]/steps?stepId=<uuid> */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await tradeVisible(access, id))) return NextResponse.json({ error: 'Trade not found.' }, { status: 404 })
    const stepId = request.nextUrl.searchParams.get('stepId')
    if (!stepId) return NextResponse.json({ error: 'stepId is required.' }, { status: 400 })

    const b = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}
    if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim().slice(0, 160)
    if (STEP_STATUS.includes(b.status)) patch.status = b.status
    if ('sortOrder' in b) patch.sort_order = parseInt(b.sortOrder, 10) || 0
    if ('dueDate' in b) patch.due_date = b.dueDate || null
    if ('note' in b) patch.note = b.note ? String(b.note).slice(0, 2000) : null
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('trade_steps').update(patch).eq('id', stepId).eq('trade_id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.trading.steps.patch', err)
    return NextResponse.json({ error: 'Could not update the step.' }, { status: 500 })
  }
}

/** DELETE /api/trading/trades/[id]/steps?stepId=<uuid> */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await tradeVisible(access, id))) return NextResponse.json({ error: 'Trade not found.' }, { status: 404 })
    const stepId = request.nextUrl.searchParams.get('stepId')
    if (!stepId) return NextResponse.json({ error: 'stepId is required.' }, { status: 400 })
    const { error } = await access.supabase.from('trade_steps').delete().eq('id', stepId).eq('trade_id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.trading.steps.delete', err)
    return NextResponse.json({ error: 'Could not delete the step.' }, { status: 500 })
  }
}
