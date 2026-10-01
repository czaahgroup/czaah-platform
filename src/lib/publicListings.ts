import { createAdminClient } from '@/lib/supabase/admin'
import { LISTING_COLUMNS, loadPlanForListing } from '@/lib/developments'
import { allowedCountries } from '@/lib/propertyLocations'
import { logError } from '@/lib/logError'

// Server-side loaders for the portal's public pages, so listings are in the
// HTML a crawler (and a first paint) receives instead of arriving after a
// client fetch. They return exactly what /api/public/properties and
// /api/public/properties/[id] return; the pages fall back to those endpoints
// when a loader gives null.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

/** Every approved listing in an active market, newest first. Null on failure. */
export async function loadPortalListings(): Promise<Row[] | null> {
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('property_listings')
      .select(LISTING_COLUMNS)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    const markets = await allowedCountries(null)
    if (markets) query = query.in('country', markets.length ? markets : ['__none__'])
    const { data, error } = await query
    if (error) throw error

    const rows = (data || []) as unknown as Row[]
    const unitIds = rows.map((p) => p.development_unit_id).filter(Boolean) as string[]
    const withPlan = new Set<string>()
    if (rows.length) {
      const ors = [`property_id.in.(${rows.map((p) => p.id).join(',')})`]
      if (unitIds.length) ors.push(`development_unit_id.in.(${unitIds.join(',')})`)
      const { data: plans } = await supabase.from('property_payment_plans').select('property_id, development_unit_id').or(ors.join(','))
      for (const pl of plans || []) {
        if (pl.property_id) withPlan.add(pl.property_id)
        if (pl.development_unit_id) withPlan.add(`unit:${pl.development_unit_id}`)
      }
    }
    return rows.map((p) => ({
      ...p,
      has_payment_plan: withPlan.has(p.id) || (!!p.development_unit_id && withPlan.has(`unit:${p.development_unit_id}`)),
    }))
  } catch (err) {
    logError('lib.publicListings', err)
    return null
  }
}

/**
 * One approved listing with its payment plan and development link.
 * `null` = no such approved listing; `undefined` = the lookup failed.
 */
export async function loadPublicListing(id: string): Promise<Row | null | undefined> {
  try {
    const supabase = createAdminClient()
    const { data: property, error } = await supabase
      .from('property_listings')
      .select(`${LISTING_COLUMNS}, partner_id`)
      .eq('id', id)
      .eq('status', 'approved')
      .maybeSingle()
    if (error) throw error
    if (!property) return null
    const row = property as unknown as Row

    const paymentPlan = await loadPlanForListing(supabase, id)
    let development = null
    if (row.development_id) {
      const { data } = await supabase
        .from('developments')
        .select('id, name, slug, developer_name, marketing_agent, status')
        .eq('id', row.development_id)
        .eq('status', 'published')
        .maybeSingle()
      development = data
    }
    return { ...row, payment_plan: paymentPlan, development }
  } catch (err) {
    logError('lib.publicListings', err, { id })
    return undefined
  }
}
