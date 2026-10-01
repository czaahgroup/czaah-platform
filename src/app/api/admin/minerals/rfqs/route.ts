import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { RFQ_STATUSES } from '@/lib/minerals'

/** Admin → Minerals → Requests: move a request along, keep notes, remove spam or tests. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const body = await request.json()
    if (!UUID.test(String(body.id))) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (body.status !== undefined) {
      if (!(RFQ_STATUSES as readonly string[]).includes(body.status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
      updates.status = body.status
    }
    if (body.admin_notes !== undefined) updates.admin_notes = String(body.admin_notes || '').trim().slice(0, 4000) || null
    if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 })

    const { error } = await auth.supabase.from('mineral_rfqs').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.minerals.rfqs', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const id = new URL(request.url).searchParams.get('id') || ''
    if (!UUID.test(id)) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
    const { error } = await auth.supabase.from('mineral_rfqs').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.minerals.rfqs', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
