/**
 * Owner / developer / partner submissions from /sell — shared rules for the
 * public endpoint, the admin review screen and conversion into a listing.
 */

export type SubmissionKind = 'sell' | 'let' | 'development' | 'partnership'
export const SUBMISSION_KINDS: SubmissionKind[] = ['sell', 'let', 'development', 'partnership']

export const SUBMISSION_STATUSES = ['pending_review', 'contacted', 'approved', 'converted', 'rejected', 'spam'] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export const KIND_LABEL: Record<SubmissionKind, string> = {
  sell: 'Sell a property',
  let: 'Let a property',
  development: 'List a development',
  partnership: 'Agent / developer partnership',
}

/** Property types offered on the form, mapped to the listing taxonomy. */
export const SUBMISSION_PROPERTY_TYPES: { v: string; l: string; assetClass: string; subtype: string | null }[] = [
  { v: 'house', l: 'House', assetClass: 'residential', subtype: 'house' },
  { v: 'apartment', l: 'Apartment / flat', assetClass: 'residential', subtype: 'flat' },
  { v: 'villa', l: 'Villa', assetClass: 'residential', subtype: 'house' },
  { v: 'penthouse', l: 'Penthouse', assetClass: 'residential', subtype: 'flat' },
  { v: 'studio', l: 'Studio', assetClass: 'residential', subtype: 'flat' },
  { v: 'room', l: 'Room', assetClass: 'residential', subtype: 'room' },
  { v: 'office', l: 'Office', assetClass: 'commercial', subtype: 'commercial_unit' },
  { v: 'retail', l: 'Retail / shop', assetClass: 'commercial', subtype: 'commercial_unit' },
  { v: 'warehouse', l: 'Warehouse / industrial', assetClass: 'industrial', subtype: 'commercial_unit' },
  { v: 'plot', l: 'Plot / land', assetClass: 'land', subtype: 'plot' },
  { v: 'other', l: 'Other', assetClass: 'residential', subtype: null },
]

export const SIZE_UNITS = ['sq_ft', 'sq_m', 'marla', 'kanal', 'sq_yd', 'acre'] as const
export const TIMELINES = ['As soon as possible', 'Within 3 months', '3–6 months', '6–12 months', 'Just exploring']

/** Images per submission, and the size limits the endpoint enforces. */
export const SUBMISSION_MAX_IMAGES = 8
export const SUBMISSION_MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const SUBMISSION_MAX_TOTAL_BYTES = 32 * 1024 * 1024

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const str = (v: FormDataEntryValue | null | undefined, max: number): string | null => {
  if (v == null || typeof v !== 'string') return null
  const s = v.replace(/\u0000/g, '').trim()
  return s ? s.slice(0, max) : null
}
const num = (v: FormDataEntryValue | null | undefined, { min = 0, max = 1e13, int = false } = {}): number | null | 'bad' => {
  const s = str(v, 40)
  if (s == null) return null
  const n = Number(s.replace(/[,\s]/g, ''))
  if (!Number.isFinite(n) || n < min || n > max) return 'bad'
  return int ? Math.round(n) : n
}

export interface CleanSubmission {
  kind: SubmissionKind
  row: Record<string, unknown>
}

/**
 * Validates a submitted form for its path. Returns the row to insert, or the
 * problems to show. Everything is trimmed, bounded and type-checked; unknown
 * fields are ignored.
 */
export function cleanSubmission(form: FormData): { data?: CleanSubmission; errors?: string[] } {
  const errors: string[] = []
  const kind = str(form.get('kind'), 20) as SubmissionKind
  if (!SUBMISSION_KINDS.includes(kind)) return { errors: ['Choose what you would like to do.'] }

  const row: Record<string, unknown> = { kind }
  row.full_name = str(form.get('full_name'), 200)
  row.email = str(form.get('email'), 254)?.toLowerCase() ?? null
  row.phone = str(form.get('phone'), 50)
  row.message = str(form.get('message'), 5000)
  if (!row.full_name) errors.push('Please enter your name.')
  if (!row.email || !EMAIL.test(String(row.email))) errors.push('Please enter a valid email address.')
  if (!row.phone) errors.push('Please enter a phone number so we can reach you.')

  const needNum = (field: string, label: string, opts?: Parameters<typeof num>[1]) => {
    const v = num(form.get(field), opts)
    if (v === 'bad') errors.push(`${label} must be a number.`)
    else row[field] = v
  }

  if (kind === 'sell' || kind === 'let') {
    row.country = str(form.get('country'), 100)
    row.city = str(form.get('city'), 100)
    row.address = str(form.get('address'), 300)
    row.property_type = str(form.get('property_type'), 40)
    if (!row.country) errors.push('Please choose the country.')
    if (!row.city) errors.push('Please enter the city.')
    if (!SUBMISSION_PROPERTY_TYPES.some((t) => t.v === row.property_type)) errors.push('Please choose the property type.')
    needNum('bedrooms', 'Bedrooms', { max: 50, int: true })
    needNum('bathrooms', 'Bathrooms', { max: 50, int: true })
    needNum('size_value', 'Size', { min: 0.01, max: 1e9 })
    const unit = str(form.get('size_unit'), 10)
    row.size_unit = unit && (SIZE_UNITS as readonly string[]).includes(unit) ? unit : row.size_value ? 'sq_ft' : null
    const ccy = str(form.get('currency'), 3)?.toUpperCase() ?? null
    row.currency = ccy && /^[A-Z]{3}$/.test(ccy) ? ccy : null

    if (kind === 'sell') {
      needNum('expected_price', 'Expected price')
      const tl = str(form.get('timeline'), 40)
      row.timeline = tl && TIMELINES.includes(tl) ? tl : null
    } else {
      needNum('expected_rent', 'Expected rent')
      const period = str(form.get('rent_period'), 10)
      row.rent_period = period === 'year' ? 'year' : 'month'
      const from = str(form.get('available_from'), 10)
      row.available_from = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : null
      const furn = str(form.get('furnishing'), 20)
      row.furnishing = furn && ['furnished', 'part_furnished', 'unfurnished'].includes(furn) ? furn : null
    }
  }

  if (kind === 'development') {
    row.company = str(form.get('company'), 200)
    row.development_name = str(form.get('development_name'), 200)
    row.developer_name = row.company
    row.country = str(form.get('country'), 100)
    row.city = str(form.get('city'), 100)
    row.completion = str(form.get('completion'), 100)
    row.website = str(form.get('website'), 300)
    needNum('units_count', 'Number of units', { min: 1, max: 100000, int: true })
    if (!row.company) errors.push('Please enter the developer / company name.')
    if (!row.development_name) errors.push('Please enter the development name.')
    if (!row.country) errors.push('Please choose the country.')
    if (!row.city) errors.push('Please enter the city.')
  }

  if (kind === 'partnership') {
    row.company = str(form.get('company'), 200)
    const pt = str(form.get('partner_type'), 20)
    row.partner_type = pt && ['agent', 'developer', 'other'].includes(pt) ? pt : null
    row.markets = str(form.get('markets'), 300)
    row.website = str(form.get('website'), 300)
    if (!row.company) errors.push('Please enter your company name.')
    if (!row.partner_type) errors.push('Please tell us what kind of partner you are.')
  }

  if (row.website && !/^https?:\/\//i.test(String(row.website))) row.website = `https://${row.website}`

  return errors.length ? { errors } : { data: { kind, row } }
}

const SQFT_PER: Record<string, number> = { sq_ft: 1, sq_m: 10.7639, sq_yd: 9, marla: 225, kanal: 4500, acre: 43560 }

/** Area in ft² for a listing, when the unit converts cleanly. */
export function toSqft(value: number | null | undefined, unit: string | null | undefined): number | null {
  if (!value || !unit || !SQFT_PER[unit]) return null
  return Math.round(value * SQFT_PER[unit])
}
