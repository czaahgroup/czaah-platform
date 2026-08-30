import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'

/**
 * GET /api/reference — countries, currencies, and current FX rates.
 * Public reference data; cached at the edge.
 */
export async function GET() {
  try {
    const db = createAdminClient()
    const [countries, currencies, fx] = await Promise.all([
      db.from('countries').select('code, name, region, dial_code, currency, flag').eq('is_active', true).order('name'),
      db.from('currencies').select('code, name, symbol, decimals').eq('is_active', true).order('code'),
      db.from('fx_rates').select('code, base, rate, as_of'),
    ])

    const rates: Record<string, { code: string; base: string; rate: number }> = {}
    for (const r of fx.data || []) rates[r.code] = { code: r.code, base: r.base, rate: Number(r.rate) }

    return NextResponse.json(
      { countries: countries.data || [], currencies: currencies.data || [], fxRates: rates },
      { headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=3600' } }
    )
  } catch (err) {
    logError('api.reference.get', err)
    return NextResponse.json({ error: 'Could not load reference data.' }, { status: 500 })
  }
}
