import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const SHIP_STATUS = ['planned', 'nominated', 'loading', 'sailed', 'arrived', 'discharged', 'completed', 'cancelled']

async function tradeVisible(access: any, id: string) {
  let q = access.supabase.from('commodity_trades').select('id').eq('id', id)
  q = scopeQuery(q, access)
  const { data } = await q.maybeSingle()
  return !!data
}

function shape(b: any) {
  const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
  return {
    vessel_name: b.vesselName ? String(b.vesselName).slice(0, 160) : null,
    status: SHIP_STATUS.includes(b.status) ? b.status : 'planned',
    bl_number: b.blNumber ? String(b.blNumber).slice(0, 80) : null,
    bl_date: b.blDate || null,
    etd: b.etd || null,
    eta: b.eta || null,
    quantity_loaded: num(b.quantityLoaded),
    quantity_discharged: num(b.quantityDischarged),
    demurrage_amount: num(b.demurrageAmount),
    note: b.note ? String(b.note).slice(0, 2000) : null,
  }
}

/** POST /api/trading/trades/[id]/shipments */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await tradeVisible(access, id))) return NextResponse.json({ error: 'Trade not found.' }, { status: 404 })
    const b = await request.json().catch(() => ({}))
    const row = { trade_id: id, ...shape(b), created_by: access.userId }
    const { data, error } = await access.supabase.from('trade_shipments').insert(row).select('id').single()
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'commodity_trade.shipment_added', targetType: 'commodity_trade', targetId: id, metadata: { shipmentId: data.id, vessel: row.vessel_name } })
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.trading.shipments.post', err)
    return NextResponse.json({ error: 'Could not add the shipment.' }, { status: 500 })
  }
}

/** PATCH /api/trading/trades/[id]/shipments?shipmentId=<uuid> */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await tradeVisible(access, id))) return NextResponse.json({ error: 'Trade not found.' }, { status: 404 })
    const shipmentId = request.nextUrl.searchParams.get('shipmentId')
    if (!shipmentId) return NextResponse.json({ error: 'shipmentId is required.' }, { status: 400 })
    const b = await request.json().catch(() => ({}))
    const s = shape(b)
    const patch: Record<string, unknown> = {}
    const map: Record<string, string> = {
      vesselName: 'vessel_name', status: 'status', blNumber: 'bl_number', blDate: 'bl_date', etd: 'etd', eta: 'eta',
      quantityLoaded: 'quantity_loaded', quantityDischarged: 'quantity_discharged', demurrageAmount: 'demurrage_amount', note: 'note',
    }
    for (const [k, col] of Object.entries(map)) if (k in b) patch[col] = (s as any)[col]
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('trade_shipments').update(patch).eq('id', shipmentId).eq('trade_id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.trading.shipments.patch', err)
    return NextResponse.json({ error: 'Could not update the shipment.' }, { status: 500 })
  }
}

/** DELETE /api/trading/trades/[id]/shipments?shipmentId=<uuid> */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await tradeVisible(access, id))) return NextResponse.json({ error: 'Trade not found.' }, { status: 404 })
    const shipmentId = request.nextUrl.searchParams.get('shipmentId')
    if (!shipmentId) return NextResponse.json({ error: 'shipmentId is required.' }, { status: 400 })
    const { error } = await access.supabase.from('trade_shipments').delete().eq('id', shipmentId).eq('trade_id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.trading.shipments.delete', err)
    return NextResponse.json({ error: 'Could not delete the shipment.' }, { status: 500 })
  }
}
