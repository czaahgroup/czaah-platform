import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { updateUnit, UNIT_COLUMNS, type UnitPayload } from '@/lib/developments'

// Edit or remove a single plot variant. Sending `paymentPlan` replaces that
// unit's plan; sending `paymentPlan: null` removes it; omitting it leaves the
// existing plan alone.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase } = auth
    const { id } = await params

    const { data: existing } = await supabase
      .from('development_units')
      .select('id, currency')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

    const unit = (await request.json()) as UnitPayload
    const result = await updateUnit(supabase, id, unit, existing.currency || 'PKR')
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    const { data } = await supabase.from('development_units').select(UNIT_COLUMNS).eq('id', id).single()

    return NextResponse.json({ data, warning: result.warning ?? null })
  } catch (err) {
    logError('api.admin.developmentUnits', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase } = auth
    const { id } = await params

    const { error } = await supabase.from('development_units').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logError('api.admin.developmentUnits', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
