// Rental terms on property_listings (rent_period, furnishing, available_from,
// deposit, min_term_months). Shared by the admin and partner listing APIs so
// both validate the same way — a bad value becomes null rather than a DB
// CHECK violation surfacing as a 500.

const RENTAL_TYPES = ['rent', 'lease']
const PERIODS = ['month', 'year']
const FURNISHING = ['furnished', 'part_furnished', 'unfurnished']

export const isRentalType = (listingType: unknown) =>
  typeof listingType === 'string' && RENTAL_TYPES.includes(listingType)

function num(v: unknown): number | null {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function date(v: unknown): string | null {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

type Body = {
  rentPeriod?: unknown
  furnishing?: unknown
  availableFrom?: unknown
  deposit?: unknown
  minTermMonths?: unknown
}

/** Columns for an INSERT. Non-rental listings get every term cleared. */
export function rentalTermsForInsert(listingType: unknown, body: Body) {
  if (!isRentalType(listingType)) {
    return { rent_period: null, furnishing: null, available_from: null, deposit: null, min_term_months: null }
  }
  const term = num(body.minTermMonths)
  return {
    // Default to monthly — the UK/PK convention — when the uploader leaves it.
    rent_period: PERIODS.includes(body.rentPeriod as string) ? body.rentPeriod : 'month',
    furnishing: FURNISHING.includes(body.furnishing as string) ? body.furnishing : null,
    available_from: date(body.availableFrom),
    deposit: num(body.deposit),
    min_term_months: term && term >= 1 ? Math.round(term) : null,
  }
}

/**
 * Columns for a PATCH. Only fields present in the body are touched; switching
 * the listing to sale/off-plan clears the terms so stale ones can't linger.
 */
export function rentalTermsForUpdate(listingType: unknown, body: Body) {
  if (listingType !== undefined && !isRentalType(listingType)) {
    return rentalTermsForInsert(listingType, body)
  }
  const out: Record<string, unknown> = {}
  if (body.rentPeriod !== undefined) out.rent_period = PERIODS.includes(body.rentPeriod as string) ? body.rentPeriod : 'month'
  if (body.furnishing !== undefined) out.furnishing = FURNISHING.includes(body.furnishing as string) ? body.furnishing : null
  if (body.availableFrom !== undefined) out.available_from = date(body.availableFrom)
  if (body.deposit !== undefined) out.deposit = num(body.deposit)
  if (body.minTermMonths !== undefined) {
    const term = num(body.minTermMonths)
    out.min_term_months = term && term >= 1 ? Math.round(term) : null
  }
  return out
}
