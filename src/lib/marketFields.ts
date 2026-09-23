/**
 * Market-specific listing fields (brief §5): the UK, Dubai and Pakistan each
 * describe property differently, so each gets its own details and filters
 * rather than one form forced on every country. Browser-safe (no database).
 *
 * Columns: migration 20260923162442_listing_market_fields.
 */

export const TENURE_LABEL: Record<string, string> = {
  freehold: 'Freehold',
  leasehold: 'Leasehold',
  share_of_freehold: 'Share of freehold',
  commonhold: 'Commonhold',
}
export const BUILD_STATUS_LABEL: Record<string, string> = { new_build: 'New build', resale: 'Resale' }
export const COUNCIL_TAX_BANDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const
export const YIELD_SOURCE_LABEL: Record<string, string> = {
  estimated: 'estimated',
  historical: 'historical',
  developer_supplied: 'developer-supplied',
  third_party: 'third-party source',
}

/** "Yield (estimated)"; an unlabelled figure is the seller's, and says so. */
export function yieldLabel(source: string | null | undefined): string {
  return source && YIELD_SOURCE_LABEL[source] ? `Yield (${YIELD_SOURCE_LABEL[source]})` : 'Yield (seller-stated)'
}

export interface MarketListingFields {
  tenure?: string | null
  lease_years_remaining?: number | null
  council_tax_band?: string | null
  service_charge?: number | null
  ground_rent?: number | null
  build_status?: string | null
  completion_date?: string | null
  society?: string | null
  phase?: string | null
  yield_source?: string | null
}

type Body = Record<string, unknown>
const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k)
const blank = (v: unknown) => v === '' || v === null || v === undefined

/**
 * Admin create/update payload (camelCase) → columns. 'insert' writes every
 * field (null when blank); 'update' writes only what the payload carries, so
 * an older form that doesn't know these fields never clears them.
 * Returns problems instead of silently dropping bad values.
 */
export function marketColumnsFromBody(body: Body, mode: 'insert' | 'update' = 'insert'): { columns: Record<string, unknown>; problems: string[] } {
  const columns: Record<string, unknown> = {}
  const problems: string[] = []
  const take = (key: string, col: string, parse: (v: unknown) => unknown | Error) => {
    if (mode === 'update' && !has(body, key)) return
    const raw = body[key]
    if (blank(raw)) {
      columns[col] = null
      return
    }
    const v = parse(raw)
    if (v instanceof Error) problems.push(v.message)
    else columns[col] = v
  }
  const oneOf = (label: string, allowed: string[]) => (v: unknown) =>
    allowed.includes(String(v)) ? String(v) : new Error(`${label} is not a valid option.`)
  const money = (label: string) => (v: unknown) => {
    const n = Number(String(v).replace(/[,\s]/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : new Error(`${label} must be a number.`)
  }

  take('tenure', 'tenure', oneOf('Tenure', Object.keys(TENURE_LABEL)))
  take('leaseYearsRemaining', 'lease_years_remaining', (v) => {
    const n = Math.round(Number(v))
    return n >= 1 && n <= 9999 ? n : new Error('Lease years remaining must be a whole number of years.')
  })
  take('councilTaxBand', 'council_tax_band', (v) => {
    const b = String(v).toUpperCase()
    return (COUNCIL_TAX_BANDS as readonly string[]).includes(b) ? b : new Error('Council tax band must be A–I.')
  })
  take('serviceCharge', 'service_charge', money('Service charge'))
  take('groundRent', 'ground_rent', money('Ground rent'))
  take('buildStatus', 'build_status', oneOf('New build / resale', Object.keys(BUILD_STATUS_LABEL)))
  take('completionDate', 'completion_date', (v) =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : new Error('Completion date must be a date.'))
  take('society', 'society', (v) => String(v).trim().slice(0, 120))
  take('phase', 'phase', (v) => String(v).trim().slice(0, 60))
  take('yieldSource', 'yield_source', oneOf('Yield source', Object.keys(YIELD_SOURCE_LABEL)))
  return { columns, problems }
}

// ── Portal filters per market ───────────────────────────────────────────

export interface FilterListing extends MarketListingFields {
  developer_name?: string | null
  development_name?: string | null
  block?: string | null
  property_subtype?: string | null
  furnishing?: string | null
  has_payment_plan?: boolean
}

export interface MarketFilter {
  /** URL parameter. */
  param: string
  label: string
  /** Fixed options, or derived from the live listings in that market. */
  options?: { v: string; l: string }[]
  derive?: (p: FilterListing) => string | null | undefined
  /** Does the listing match the chosen value? */
  match: (p: FilterListing, value: string) => boolean
  sections?: ('buy' | 'rent')[]
}

const eq = (a: unknown, b: string) => String(a ?? '').trim().toLowerCase() === b.trim().toLowerCase()
const societyOf = (p: FilterListing) => p.society || p.development_name || null

/** Keyed by ISO country code. A market without an entry gets the common filters only. */
export const MARKET_FILTERS: Record<string, MarketFilter[]> = {
  GB: [
    { param: 'tenure', label: 'Tenure', options: Object.entries(TENURE_LABEL).map(([v, l]) => ({ v, l })), match: (p, v) => p.tenure === v, sections: ['buy'] },
    { param: 'build', label: 'New build / resale', options: Object.entries(BUILD_STATUS_LABEL).map(([v, l]) => ({ v, l })), match: (p, v) => p.build_status === v, sections: ['buy'] },
    { param: 'ctax', label: 'Council tax band', options: COUNCIL_TAX_BANDS.map((b) => ({ v: b, l: `Band ${b}` })), match: (p, v) => p.council_tax_band === v },
  ],
  AE: [
    { param: 'developer', label: 'Developer', derive: (p) => p.developer_name, match: (p, v) => eq(p.developer_name, v) },
    { param: 'completion', label: 'Completion', derive: (p) => (p.completion_date ? p.completion_date.slice(0, 4) : null), match: (p, v) => (p.completion_date || '').startsWith(v), sections: ['buy'] },
    { param: 'plan', label: 'Payment plan', options: [{ v: 'yes', l: 'With payment plan' }], match: (p) => !!p.has_payment_plan, sections: ['buy'] },
    {
      param: 'furnished', label: 'Furnishing',
      options: [{ v: 'furnished', l: 'Furnished' }, { v: 'part_furnished', l: 'Part furnished' }, { v: 'unfurnished', l: 'Unfurnished' }],
      match: (p, v) => p.furnishing === v, sections: ['buy'],
    },
  ],
  PK: [
    {
      param: 'kind', label: 'Property',
      options: [{ v: 'house', l: 'House' }, { v: 'flat', l: 'Apartment' }, { v: 'plot', l: 'Plot' }, { v: 'commercial_unit', l: 'Commercial' }],
      match: (p, v) => p.property_subtype === v,
    },
    { param: 'society', label: 'Society', derive: societyOf, match: (p, v) => eq(societyOf(p), v) },
    { param: 'phase', label: 'Phase', derive: (p) => p.phase, match: (p, v) => eq(p.phase, v) },
    { param: 'block', label: 'Block', derive: (p) => p.block, match: (p, v) => eq(p.block, v) },
  ],
}

export function marketFiltersFor(code: string | null | undefined, section: 'buy' | 'rent'): MarketFilter[] {
  if (!code) return []
  return (MARKET_FILTERS[code.toUpperCase()] || []).filter((f) => !f.sections || f.sections.includes(section))
}

/**
 * Options for a filter: fixed ones, or the distinct values among live
 * listings. Either way an option is only offered when at least one listing
 * matches it — a choice that can only return nothing is never shown, so a
 * filter appears on its own once listings carry that detail.
 */
export function filterOptions(f: MarketFilter, listings: FilterListing[]): { v: string; l: string }[] {
  if (f.options) return f.options.filter((o) => listings.some((p) => f.match(p, o.v)))
  const seen = new Map<string, string>()
  for (const p of listings) {
    const v = f.derive?.(p)
    if (v && String(v).trim()) seen.set(String(v).trim().toLowerCase(), String(v).trim())
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b)).map((v) => ({ v, l: v }))
}

export function applyMarketFilters<T extends FilterListing>(list: T[], filters: MarketFilter[], params: URLSearchParams): T[] {
  let out = list
  for (const f of filters) {
    const v = params.get(f.param)
    if (v) out = out.filter((p) => f.match(p, v))
  }
  return out
}
