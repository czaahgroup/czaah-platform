import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'

/**
 * Spot metal prices for minerals.czaah.com.
 *
 * Prices come from gold-api.com (free, no key) and are kept in the
 * metal_prices table, refreshed at most every REFRESH_MINUTES. A page view
 * therefore never waits on the feed more than once in that window, and if the
 * feed is down the last prices are shown with their real time — until they
 * are older than STALE_HOURS, when the panel is hidden rather than show an
 * old price as if it were current.
 *
 * Only what the feed reports is shown: no daily change is displayed, because
 * the feed does not give one and it must never be made up.
 */

const FEED = 'https://api.gold-api.com/price'
const REFRESH_MINUTES = 30
const STALE_HOURS = 24
const LB_PER_TONNE = 2204.62262

// The feed quotes precious metals per troy ounce and copper (COMEX, "HG") per
// pound; copper is converted to the per-tonne figure the trade uses.
export const METALS = [
  { symbol: 'XAU', name: 'Gold', unit: 'US$ / troy oz', factor: 1 },
  { symbol: 'XAG', name: 'Silver', unit: 'US$ / troy oz', factor: 1 },
  { symbol: 'XPT', name: 'Platinum', unit: 'US$ / troy oz', factor: 1 },
  { symbol: 'XPD', name: 'Palladium', unit: 'US$ / troy oz', factor: 1 },
  { symbol: 'HG', name: 'Copper', unit: 'US$ / tonne', factor: LB_PER_TONNE },
] as const

export interface MetalPrice {
  symbol: string
  name: string
  price_usd: number
  unit: string
  /** When the feed says the price was last updated. */
  source_updated_at: string | null
  fetched_at: string
}

/** A price from the feed's reply, or null if the reply is not usable. Pure. */
export function priceFromFeed(metal: (typeof METALS)[number], reply: unknown, now = new Date()): MetalPrice | null {
  const r = (reply && typeof reply === 'object' ? reply : {}) as Record<string, unknown>
  const price = Number(r.price)
  if (r.symbol !== metal.symbol || r.currency !== 'USD' || !Number.isFinite(price) || price <= 0) return null
  const updated = typeof r.updatedAt === 'string' && !Number.isNaN(Date.parse(r.updatedAt)) ? new Date(r.updatedAt).toISOString() : null
  return {
    symbol: metal.symbol,
    name: metal.name,
    price_usd: Math.round(price * metal.factor * 100) / 100,
    unit: metal.unit,
    source_updated_at: updated,
    fetched_at: now.toISOString(),
  }
}

/** Which stored prices may be shown, and whether it is time to ask the feed again. Pure. */
export function assessPrices(rows: MetalPrice[], now = new Date()): { show: MetalPrice[]; refresh: boolean } {
  const age = (r: MetalPrice) => now.getTime() - Date.parse(r.fetched_at)
  const show = METALS.map((m) => rows.find((r) => r.symbol === m.symbol)).filter((r): r is MetalPrice => !!r && age(r) < STALE_HOURS * 3600_000)
  const refresh = METALS.some((m) => {
    const row = rows.find((r) => r.symbol === m.symbol)
    return !row || age(row) > REFRESH_MINUTES * 60_000
  })
  return { show, refresh }
}

async function fetchFromFeed(): Promise<MetalPrice[]> {
  const results = await Promise.all(
    METALS.map(async (metal) => {
      try {
        const res = await fetch(`${FEED}/${metal.symbol}`, {
          // The Workers runtime sends no User-Agent by default and some APIs refuse that.
          headers: { 'User-Agent': 'czaah-minerals/1.0 (+https://minerals.czaah.com)', Accept: 'application/json' },
          signal: AbortSignal.timeout(4000),
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`feed ${metal.symbol}: HTTP ${res.status}`)
        return priceFromFeed(metal, await res.json())
      } catch (err) {
        logError('lib.metalPrices', err, { symbol: metal.symbol })
        return null
      }
    }),
  )
  return results.filter((r): r is MetalPrice => !!r)
}

/** The prices to show, refreshing the cache first when it is due. Empty when none are fresh enough. */
export async function loadMetalPrices(): Promise<MetalPrice[]> {
  try {
    const db = createAdminClient()
    const { data, error } = await db.from('metal_prices').select('symbol, name, price_usd, unit, source_updated_at, fetched_at')
    if (error) throw error
    let rows = (data || []).map((r) => ({ ...r, price_usd: Number(r.price_usd) })) as MetalPrice[]

    if (assessPrices(rows).refresh) {
      const fresh = await fetchFromFeed()
      if (fresh.length) {
        const { error: saveError } = await db.from('metal_prices').upsert(fresh, { onConflict: 'symbol' })
        if (saveError) logError('lib.metalPrices', saveError, { step: 'save' })
        rows = METALS.map((m) => fresh.find((f) => f.symbol === m.symbol) || rows.find((r) => r.symbol === m.symbol)).filter(Boolean) as MetalPrice[]
      }
    }
    return assessPrices(rows).show
  } catch (err) {
    logError('lib.metalPrices', err)
    return []
  }
}
