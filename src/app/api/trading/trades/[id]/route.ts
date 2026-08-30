import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const DESK = ['oil_gas', 'minerals', 'agri', 'other']
const SIDE = ['buy', 'sell']
const STATUS = ['inquiry', 'offer', 'negotiation', 'contract', 'nomination', 'in_transit', 'delivered', 'settled', 'closed', 'cancelled']

async function loadScoped(access: any, id: string) {
  let q = access.supabase
    .from('commodity_trades')
    .select('*, counterparty:crm_companies(id, name), deal:deals(id, reference, title), owner:profiles!commodity_trades_owner_id_fkey(id, full_name)')
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
    const trade = await loadScoped(access, id)
    if (!trade) return NextResponse.json({ error: 'Trade not found.' }, { status: 404 })

    const [{ data: steps }, { data: shipments }] = await Promise.all([
      access.supabase.from('trade_steps').select('*').eq('trade_id', id).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      access.supabase.from('trade_shipments').select('*').eq('trade_id', id).order('created_at', { ascending: true }),
    ])
    return NextResponse.json({ data: { ...trade, steps: steps || [], shipments: shipments || [] } })
  } catch (err) {
    logError('api.trading.trades.id.get', err)
    return NextResponse.json({ error: 'Could not load the trade.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    const before = await loadScoped(access, id)
    if (!before) return NextResponse.json({ error: 'Trade not found.' }, { status: 404 })

    const b = await request.json().catch(() => ({}))
    const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
    const patch: Record<string, unknown> = {}
    if (typeof b.title === 'string' && b.title.trim()) patch.title = b.title.trim().slice(0, 300)
    if (DESK.includes(b.desk)) patch.desk = b.desk
    if (SIDE.includes(b.side)) patch.side = b.side
    if (STATUS.includes(b.status)) patch.status = b.status
    if (typeof b.commodity === 'string' && b.commodity.trim()) patch.commodity = b.commodity.trim().slice(0, 120)
    if ('grade' in b) patch.grade = b.grade ? String(b.grade).slice(0, 120) : null
    if ('counterpartyId' in b) patch.counterparty_id = b.counterpartyId || null
    if ('dealId' in b) patch.deal_id = b.dealId || null
    if ('quantity' in b) patch.quantity = num(b.quantity)
    if ('quantityUnit' in b) patch.quantity_unit = b.quantityUnit ? String(b.quantityUnit).slice(0, 40) : null
    if ('priceBasis' in b) patch.price_basis = b.priceBasis ? String(b.priceBasis).slice(0, 200) : null
    if ('priceAmount' in b) patch.price_amount = num(b.priceAmount)
    if ('currency' in b) patch.currency = b.currency ? String(b.currency).toUpperCase().slice(0, 3) : null
    if ('incoterm' in b) patch.incoterm = b.incoterm ? String(b.incoterm).toUpperCase().slice(0, 10) : null
    if ('loadPort' in b) patch.load_port = b.loadPort ? String(b.loadPort).slice(0, 120) : null
    if ('dischargePort' in b) patch.discharge_port = b.dischargePort ? String(b.dischargePort).slice(0, 120) : null
    if ('loadCountry' in b) patch.load_country = b.loadCountry ? String(b.loadCountry).toUpperCase().slice(0, 2) : null
    if ('dischargeCountry' in b) patch.discharge_country = b.dischargeCountry ? String(b.dischargeCountry).toUpperCase().slice(0, 2) : null
    if ('contractType' in b) patch.contract_type = b.contractType ? String(b.contractType).slice(0, 40) : null
    if ('laycanStart' in b) patch.laycan_start = b.laycanStart || null
    if ('laycanEnd' in b) patch.laycan_end = b.laycanEnd || null
    if ('notes' in b) patch.notes = b.notes ? String(b.notes).slice(0, 8000) : null
    if ('ownerId' in b && access.scope === 'all') patch.owner_id = b.ownerId || null
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('commodity_trades').update(patch).eq('id', id)
    if (error) throw error
    await logActivity({
      actorId: access.userId,
      action: patch.status && patch.status !== before.status ? 'commodity_trade.status_changed' : 'commodity_trade.updated',
      targetType: 'commodity_trade', targetId: id, metadata: { fields: Object.keys(patch) },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.trading.trades.id.patch', err)
    return NextResponse.json({ error: 'Could not update the trade.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.role !== 'super_admin') return NextResponse.json({ error: 'Only a super admin can delete a trade.' }, { status: 403 })
  try {
    const { id } = await params
    const { error } = await access.supabase.from('commodity_trades').delete().eq('id', id)
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'commodity_trade.deleted', targetType: 'commodity_trade', targetId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.trading.trades.id.delete', err)
    return NextResponse.json({ error: 'Could not delete the trade.' }, { status: 500 })
  }
}
