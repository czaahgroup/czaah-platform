import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { insertUnit, UNIT_COLUMNS, type UnitPayload } from '@/lib/developments'

// Add one plot variant to an existing development.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase } = auth
    const { id } = await params

    const { data: development } = await supabase
      .from('developments')
      .select('id, currency')
      .eq('id', id)
      .single()

    if (!development) {
      return NextResponse.json({ error: 'Development not found' }, { status: 404 })
    }

    const unit = (await request.json()) as UnitPayload
    if (!unit?.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Place the new variant at the end of the current list.
    const { count } = await supabase
      .from('development_units')
      .select('id', { count: 'exact', head: true })
      .eq('development_id', id)

    const result = await insertUnit(supabase, id, unit, count ?? 0, development.currency)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const { data } = await supabase
      .from('development_units')
      .select(UNIT_COLUMNS)
      .eq('id', result.id!)
      .single()

    return NextResponse.json({ data, warning: result.warning ?? null }, { status: 201 })
  } catch (err) {
    logError('api.admin.developments.units', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
