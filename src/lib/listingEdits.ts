import { CURRENCIES } from '@/lib/currencies'
import { rentalTermsForUpdate } from '@/lib/rentalTerms'

/**
 * What a partner may change on their own listing, and how a change to a live
 * listing is held for approval.
 *
 * A pending or rejected listing is edited directly. A listing that is already
 * approved is public, so an edit is stored as a proposal
 * (property_listing_changes) and the site keeps showing the approved version
 * until a super admin accepts it. Pure module: shared by the partner API, the
 * admin API and both screens.
 */

const PROPERTY_TYPES = ['residential', 'commercial', 'industrial', 'land', 'mixed_use']
const LISTING_TYPES = ['sale', 'rent', 'lease', 'off_plan']

/** Columns a partner's edit can touch. Nothing else is ever written from one. */
export const EDIT_LABELS: Record<string, string> = {
  title: 'Title',
  property_type: 'Property type',
  listing_type: 'Listing type',
  price: 'Price',
  currency: 'Currency',
  location: 'Location',
  city: 'City',
  country: 'Country',
  area_sqft: 'Area (sq ft)',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  description: 'Description',
  features: 'Features',
  images: 'Photos',
  rent_period: 'Rent period',
  furnishing: 'Furnishing',
  available_from: 'Available from',
  deposit: 'Deposit',
  min_term_months: 'Minimum term (months)',
}
export const EDIT_COLUMNS = Object.keys(EDIT_LABELS)

type Body = Record<string, unknown>

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

/** A count or size: empty clears it, anything else must be a number ≥ 0. */
function amount(v: unknown, label: string, problems: string[], whole = false): number | null {
  if (v === '' || v == null) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) {
    problems.push(`${label} must be a number.`)
    return null
  }
  return whole ? Math.round(n) : n
}

/**
 * The listing columns an edit form's body carries, validated. Only keys the
 * body actually has are returned, so a partial edit leaves the rest alone.
 * Photos are not handled here — they need storage checks (see the API).
 */
export function cleanListingEdit(body: Body): { columns: Record<string, unknown>; problems: string[] } {
  const c: Record<string, unknown> = {}
  const problems: string[] = []
  const has = (k: string) => body[k] !== undefined

  const required = (key: string, column: string, max: number) => {
    if (!has(key)) return
    const v = text(body[key], max)
    if (!v) problems.push(`${EDIT_LABELS[column]} is required.`)
    else c[column] = v
  }
  required('title', 'title', 160)
  required('location', 'location', 160)
  required('city', 'city', 80)
  required('country', 'country', 80)

  if (has('propertyType')) {
    if (PROPERTY_TYPES.includes(body.propertyType as string)) c.property_type = body.propertyType
    else problems.push('Choose a property type.')
  }
  if (has('listingType')) {
    if (LISTING_TYPES.includes(body.listingType as string)) c.listing_type = body.listingType
    else problems.push('Choose a listing type.')
  }
  if (has('currency')) {
    if (CURRENCIES.includes(body.currency as string)) c.currency = body.currency
    else problems.push('Choose a supported currency.')
  }
  if (has('price')) c.price = amount(body.price, 'Price', problems)
  if (has('areaSqft')) c.area_sqft = amount(body.areaSqft, 'Area', problems)
  if (has('bedrooms')) c.bedrooms = amount(body.bedrooms, 'Bedrooms', problems, true)
  if (has('bathrooms')) c.bathrooms = amount(body.bathrooms, 'Bathrooms', problems, true)
  if (has('description')) c.description = text(body.description, 5000) || null
  if (has('features')) {
    const list = Array.isArray(body.features) ? body.features : String(body.features ?? '').split(',')
    c.features = [...new Set(list.map((f) => text(f, 60)).filter(Boolean))].slice(0, 40)
  }
  // Rental terms follow the listing type: switching to sale clears them.
  Object.assign(c, rentalTermsForUpdate(has('listingType') ? body.listingType : undefined, body))

  return { columns: c, problems }
}

const same = (a: unknown, b: unknown) => {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) === JSON.stringify(b ?? [])
  if (a == null || a === '') return b == null || b === ''
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b)
  return a === b
}

/** Only the editable columns whose value differs from the listing as it stands. */
export function changedOnly(columns: Record<string, unknown>, current: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of EDIT_COLUMNS) {
    if (key in columns && !same(columns[key], current[key])) out[key] = columns[key]
  }
  return out
}

/** Drops anything that is not an editable column — applied again when a proposal is accepted. */
export function editableOnly(changes: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!changes || typeof changes !== 'object') return out
  for (const key of EDIT_COLUMNS) {
    if (key in (changes as Record<string, unknown>)) out[key] = (changes as Record<string, unknown>)[key]
  }
  return out
}

/** One value, worded for the before/after list an admin reviews. */
export function describeValue(column: string, value: unknown): string {
  if (value == null || value === '') return '—'
  if (column === 'images') return `${(value as unknown[]).length} photo${(value as unknown[]).length === 1 ? '' : 's'}`
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (typeof value === 'number') return value.toLocaleString('en-GB')
  return String(value).replace(/_/g, ' ')
}

/**
 * What the owner may do to a listing in each state without asking anyone.
 * Taking a listing off the site needs no approval; putting one on always does.
 */
export type OwnerAction = 'mark_sold' | 'withdraw' | 'relist' | 'cancel_changes'

export function ownerActionResult(action: unknown, status: string): { status?: string; error?: string } {
  if (action === 'mark_sold') {
    return status === 'approved' ? { status: 'sold' } : { error: 'Only a live listing can be marked as sold or let.' }
  }
  if (action === 'withdraw') {
    return status === 'approved' || status === 'pending' ? { status: 'inactive' } : { error: 'This listing is not on the site.' }
  }
  if (action === 'relist') {
    return ['sold', 'inactive', 'rejected'].includes(status) ? { status: 'pending' } : { error: 'This listing is already live or awaiting approval.' }
  }
  if (action === 'cancel_changes') return {}
  return { error: 'Unknown action.' }
}

/** Status as a partner reads it. */
export const LISTING_STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting approval',
  approved: 'Live',
  rejected: 'Not approved',
  sold: 'Sold / let',
  inactive: 'Withdrawn',
}
