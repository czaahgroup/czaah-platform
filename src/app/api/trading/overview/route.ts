import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { logError } from '@/lib/logError'

const OPEN = ['inquiry', 'offer', 'negotiation', 'contract', 'nomination', 'in_transit', 'delivered']
const EXECUTING = ['contract', 'nomination', 'in_transit', 'delivered']

/** GET /api/trading/overview — KPIs for the trading desk dashboard */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const db = access.supabase
    const count = (q: any) => q.select('*', { count: 'exact', head: true })

    const [openT, executing, settled, activeShipments, rows] = await Promise.all([
      count(db.from('commodity_trades')).in('status', OPEN),
      count(db.from('commodity_trades')).in('status', EXECUTING),
      count(db.from('commodity_trades')).eq('status', 'settled'),
      count(db.from('trade_shipments')).in('status', ['nominated', 'loading', 'sailed', 'arrived']),
      db.from('commodity_trades').select('desk, status, quantity, price_amount').in('status', OPEN),
    ])

    const open = rows.data || []
    const notional = Math.round(open.reduce((s: number, t: any) => s + ((Number(t.quantity) || 0) * (Number(t.price_amount) || 0)), 0))
    const byDesk: Record<string, number> = {}
    for (const t of open) byDesk[t.desk] = (byDesk[t.desk] || 0) + 1

    return NextResponse.json({
      openTrades: openT.count ?? 0,
      executing: executing.count ?? 0,
      settled: settled.count ?? 0,
      activeShipments: activeShipments.count ?? 0,
      notionalOpen: notional,
      byDesk,
    })
  } catch (err) {
    logError('api.trading.overview.get', err)
    return NextResponse.json({ error: 'Could not load the trading overview.' }, { status: 500 })
  }
}
