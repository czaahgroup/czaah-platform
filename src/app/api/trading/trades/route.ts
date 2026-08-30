import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery, safeTerm } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const DESK = ['oil_gas', 'minerals', 'agri', 'other']
const SIDE = ['buy', 'sell']
const STATUS = ['inquiry', 'offer', 'negotiation', 'contract', 'nomination', 'in_transit', 'delivered', 'settled', 'closed', 'cancelled']
const PAGE = 50

function makeRef() {
  const d = new Date()
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`
  return `TR-${ym}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

/** GET /api/trading/trades?desk=&side=&status=&q=&view=open|all&page= */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const p = request.nextUrl.searchParams
    const desk = p.get('desk')
    const side = p.get('side')
    const status = p.get('status')
    const view = p.get('view') || 'all'
    const q = safeTerm(p.get('q'))
    const page = Math.max(0, parseInt(p.get('page') || '0', 10))

    let query = access.supabase
      .from('commodity_trades')
      .select('id, reference, title, desk, side, status, commodity, grade, quantity, quantity_unit, price_amount, currency, incoterm, laycan_start, laycan_end, created_at, counterparty:crm_companies(id, name), steps:trade_steps(count), shipments:trade_shipments(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    query = scopeQuery(query, access)
    if (desk && DESK.includes(desk)) query = query.eq('desk', desk)
    if (side && SIDE.includes(side)) query = query.eq('side', side)
    if (status && STATUS.includes(status)) query = query.eq('status', status)
    if (view === 'open') query = query.not('status', 'in', '(closed,cancelled,settled)')
    if (q) query = query.or(`title.ilike.%${q}%,reference.ilike.%${q}%,commodity.ilike.%${q}%`)

    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({
      data: (data || []).map((t) => ({
        ...t,
        stepCount: t.steps?.[0]?.count ?? 0,
        shipmentCount: t.shipments?.[0]?.count ?? 0,
        steps: undefined, shipments: undefined,
      })),
      page, pageSize: PAGE, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * PAGE,
    })
  } catch (err) {
    logError('api.trading.trades.get', err)
    return NextResponse.json({ error: 'Could not load trades.' }, { status: 500 })
  }
}

/** POST /api/trading/trades */
export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const title = String(b.title || '').trim()
    const commodity = String(b.commodity || '').trim()
    if (!title) return NextResponse.json({ error: 'A trade title is required.' }, { status: 400 })
    if (!commodity) return NextResponse.json({ error: 'A commodity is required.' }, { status: 400 })

    const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
    const row = {
      reference: makeRef(),
      title: title.slice(0, 300),
      desk: DESK.includes(b.desk) ? b.desk : 'oil_gas',
      side: SIDE.includes(b.side) ? b.side : 'buy',
      status: STATUS.includes(b.status) ? b.status : 'inquiry',
      commodity: commodity.slice(0, 120),
      grade: b.grade ? String(b.grade).slice(0, 120) : null,
      counterparty_id: b.counterpartyId || null,
      deal_id: b.dealId || null,
      quantity: num(b.quantity),
      quantity_unit: b.quantityUnit ? String(b.quantityUnit).slice(0, 40) : null,
      price_basis: b.priceBasis ? String(b.priceBasis).slice(0, 200) : null,
      price_amount: num(b.priceAmount),
      currency: b.currency ? String(b.currency).toUpperCase().slice(0, 3) : null,
      incoterm: b.incoterm ? String(b.incoterm).toUpperCase().slice(0, 10) : null,
      load_port: b.loadPort ? String(b.loadPort).slice(0, 120) : null,
      discharge_port: b.dischargePort ? String(b.dischargePort).slice(0, 120) : null,
      load_country: b.loadCountry ? String(b.loadCountry).toUpperCase().slice(0, 2) : null,
      discharge_country: b.dischargeCountry ? String(b.dischargeCountry).toUpperCase().slice(0, 2) : null,
      contract_type: b.contractType ? String(b.contractType).slice(0, 40) : null,
      laycan_start: b.laycanStart || null,
      laycan_end: b.laycanEnd || null,
      notes: b.notes ? String(b.notes).slice(0, 8000) : null,
      owner_id: b.ownerId || access.userId,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('commodity_trades').insert(row).select('id, reference').single()
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'commodity_trade.created', targetType: 'commodity_trade', targetId: data.id, metadata: { title, reference: data.reference } })
    return NextResponse.json({ data })
  } catch (err) {
    logError('api.trading.trades.post', err)
    return NextResponse.json({ error: 'Could not create the trade.' }, { status: 500 })
  }
}
