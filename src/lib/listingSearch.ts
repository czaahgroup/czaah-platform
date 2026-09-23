import { FX_PER_USD } from '@/lib/currencies'
import { applyMarketFilters, type MarketFilter } from '@/lib/marketFields'
import { plotSizeInSqFt } from '@/lib/plots'

// The portal's search filters, in one place (2026-09-23). The Buy, Rent,
// All listings and Off-plan pages AND the saved-search email alerts all call
// filterListings(), so an alert can never match something the page itself
// would not show. Pure: no browser or runtime state — FX rates are passed in.

export type SearchSection = 'buy' | 'rent' | 'listings' | 'off-plan'

/** The query parameters each section filters on (sort, page, ccy only order/display). */
export const SECTION_FILTER_PARAMS: Record<SearchSection, string[]> = {
  buy: ['market', 'search', 'type', 'beds', 'price', 'stage'],
  rent: ['market', 'search', 'type', 'beds', 'price', 'furnishing'],
  listings: ['market', 'search', 'type', 'beds', 'price', 'listing_type', 'with_yield', 'plot_size', 'plot_category', 'possession', 'corner', 'main_road', 'canal_facing', 'approved'],
  'off-plan': ['market', 'search', 'type', 'price'],
}

export const PLOT_FLAGS = [
  { key: 'corner', column: 'corner_plot', label: 'Corner' },
  { key: 'main_road', column: 'main_road', label: 'Main road' },
  { key: 'canal_facing', column: 'canal_facing', label: 'Canal facing' },
  { key: 'approved', column: 'approved', label: 'Approved' },
] as const

// Loose on purpose: pages pass LiveProperty, the alert job passes DB rows.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listing = Record<string, any>

export interface SearchLocation {
  country: { name: string }
  city: { name: string } | null
}

export interface SearchContext {
  /** Units per USD; the page passes the admin-edited table, the job the same from portal_content. */
  fxPerUsd?: Record<string, number>
  /** From /buy/<country>/<city> or /rent/... — resolved against Admin → Locations. */
  loc?: SearchLocation | null
  /** marketFiltersFor(loc.country.code, section) for buy/rent. */
  marketFilters?: MarketFilter[]
}

export const isRentalListing = (p: Listing) => p.listing_type === 'rent' || p.listing_type === 'lease'

/** Same arithmetic as convertPrice(amount, currency, 'USD') in the portal. */
export function toUsd(amount: number, currency: string, fx: Record<string, number> = FX_PER_USD): number | null {
  const fromRate = fx[currency] ?? FX_PER_USD[currency]
  const toRate = fx.USD ?? FX_PER_USD.USD
  return fromRate && toRate ? (amount / fromRate) * toRate : null
}

/** Approximate USD value of a purchase price, for comparing across markets. */
export const usdPrice = (p: Listing, fx?: Record<string, number>) =>
  p.price ? toUsd(p.price, p.currency, fx) ?? p.price : null

/** A rent as its USD monthly equivalent. */
export const usdMonthlyRent = (p: Listing, fx?: Record<string, number>) => {
  const perMonth = (p.price ?? 0) / (p.rent_period === 'year' ? 12 : 1)
  return toUsd(perMonth, p.currency, fx) ?? perMonth
}

export function matchesMarketKey(p: Listing, market: string) {
  if (!market || market === 'all') return true
  if (market === 'london') return p.city?.toLowerCase() === 'london'
  if (market === 'dubai') return p.city?.toLowerCase() === 'dubai'
  if (market === 'pakistan') return p.country?.toLowerCase() === 'pakistan'
  return true
}

function inSearchLocation(p: Listing, loc: SearchLocation | null | undefined) {
  if (!loc) return true
  if ((p.country || '').trim().toLowerCase() !== loc.country.name.toLowerCase()) return false
  if (loc.city && (p.city || '').trim().toLowerCase() !== loc.city.name.toLowerCase()) return false
  return true
}

function matchesText(p: Listing, s: string, withDevelopment: boolean) {
  return (
    p.title?.toLowerCase().includes(s) ||
    p.location?.toLowerCase().includes(s) ||
    p.city?.toLowerCase().includes(s) ||
    p.country?.toLowerCase().includes(s) ||
    p.description?.toLowerCase().includes(s) ||
    (withDevelopment && p.development_name?.toLowerCase().includes(s))
  )
}

/** Every listing the section's page would show for these parameters (unsorted). */
export function filterListings<T>(input: T[], section: SearchSection, params: URLSearchParams, ctx: SearchContext = {}): T[] {
  const all = input as unknown as Listing[]
  type T2 = Listing
  const fx = ctx.fxPerUsd
  const get = (k: string) => params.get(k) || ''
  const market = get('market') || 'all'
  const type = get('type')
  const beds = get('beds')
  const price = get('price')
  const search = get('search').toLowerCase()
  const [min, max] = price ? price.split('-') : ['', '']
  const saleBand = (list: T2[]) => {
    let out = list
    if (min) out = out.filter((p) => (usdPrice(p, fx) ?? -1) >= Number(min))
    if (max) out = out.filter((p) => { const v = usdPrice(p, fx); return v != null && v <= Number(max) })
    return out
  }
  const rentBand = (list: T2[]) => {
    let out = list
    if (min) out = out.filter((p) => usdMonthlyRent(p, fx) >= Number(min))
    if (max) out = out.filter((p) => usdMonthlyRent(p, fx) <= Number(max))
    return out
  }

  let list: T2[]
  if (section === 'buy') {
    // Everything with a purchase price: completed stock and off-plan.
    list = all.filter((p) => !isRentalListing(p))
    const stage = get('stage')
    if (stage) list = list.filter((p) => p.listing_type === stage)
  } else if (section === 'rent') {
    // Rent and lease are both tenancies.
    list = all.filter(isRentalListing)
    const furnishing = get('furnishing')
    if (furnishing) list = list.filter((p) => p.furnishing === furnishing)
  } else if (section === 'off-plan') {
    list = all.filter((p) => p.listing_type === 'off_plan')
  } else {
    list = [...all]
  }

  list = list.filter((p) => matchesMarketKey(p, market))
  if (section === 'buy' || section === 'rent') {
    list = list.filter((p) => inSearchLocation(p, ctx.loc))
    list = applyMarketFilters(list, ctx.marketFilters || [], params)
  }
  if (type) list = list.filter((p) => p.property_type === type)
  if (beds && section !== 'off-plan') list = list.filter((p) => (p.bedrooms ?? -1) >= Number(beds))

  if (section === 'listings') {
    const listingType = get('listing_type')
    const rentView = listingType === 'rent' || listingType === 'lease'
    // Investments: purchasable listings that state a yield.
    if (params.get('with_yield')) list = list.filter((p) => p.yield_percentage != null && !isRentalListing(p))
    // "For Rent" covers commercial leases too.
    if (listingType) list = list.filter((p) => (rentView ? isRentalListing(p) : p.listing_type === listingType))
    if (price) {
      // Sale bands are capital prices; a monthly rent is not comparable.
      list = rentView ? rentBand(list) : saleBand(list.filter((p) => !isRentalListing(p)))
    }
    // Plot narrowing: a listing with no plot data drops out.
    const plotSize = get('plot_size')
    if (plotSize) {
      const [pMin, pMax] = plotSize.split('-')
      list = list.filter((p) => {
        const sqft = plotSizeInSqFt(p.plot_size, p.plot_size_unit)
        if (sqft == null) return false
        if (pMin && sqft < Number(pMin)) return false
        if (pMax && sqft > Number(pMax)) return false
        return true
      })
    }
    const plotCategory = get('plot_category')
    if (plotCategory) list = list.filter((p) => p.plot_category === plotCategory)
    const possession = get('possession')
    if (possession) list = list.filter((p) => p.possession_status === possession)
    for (const flag of PLOT_FLAGS) {
      if (params.get(flag.key) === '1') list = list.filter((p) => !!p[flag.column])
    }
  } else if (price) {
    list = section === 'rent' ? rentBand(list) : saleBand(list)
  }

  if (search) list = list.filter((p) => matchesText(p, search, section === 'listings'))
  return list as unknown as T[]
}
