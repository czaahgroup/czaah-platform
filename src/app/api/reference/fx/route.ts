import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'

/**
 * POST /api/reference/fx — refresh FX rates from an external source.
 * Cron target (see .github/workflows/fx-refresh.yml.disabled).
 * Auth: Bearer CRON_SECRET. Source: FX_API_URL returning { rates: {CODE: n} }
 * with USD base (e.g. open.er-api.com / exchangerate.host).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const url = process.env.FX_API_URL
    if (!url) return NextResponse.json({ error: 'FX_API_URL not configured.' }, { status: 500 })

    const res = await fetch(url, { headers: { 'User-Agent': 'czaah-platform' } })
    if (!res.ok) return NextResponse.json({ error: `FX source returned ${res.status}` }, { status: 502 })
    const body = await res.json()
    const rates: Record<string, number> = body.rates || body.data || {}
    if (!rates || !rates.USD) return NextResponse.json({ error: 'Unexpected FX payload.' }, { status: 502 })

    const db = createAdminClient()
    const { data: known } = await db.from('currencies').select('code').eq('is_active', true)
    const codes = new Set((known || []).map((c) => c.code))
    const now = new Date().toISOString()

    const rows = Object.entries(rates)
      .filter(([code]) => codes.has(code))
      .map(([code, rate]) => ({ code, base: 'USD', rate, as_of: now, source: url }))

    if (rows.length) {
      const { error } = await db.from('fx_rates').upsert(rows, { onConflict: 'code' })
      if (error) throw error
    }
    return NextResponse.json({ updated: rows.length })
  } catch (err) {
    logError('api.reference.fx', err)
    return NextResponse.json({ error: 'FX refresh failed.' }, { status: 500 })
  }
}
