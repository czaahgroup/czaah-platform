import { CURRENCIES } from '@/lib/currencies'
import { rentalTermsForUpdate } from '@/lib/rentalTerms'
import { PROPERTY_SUBTYPES, PLOT_CATEGORIES, POSSESSION_STATUSES, assetClassFor, isPlotSizeUnit } from '@/lib/plots'
import { validatePaymentPlan } from '@/lib/paymentPlan'

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
  property_subtype: 'What it is',
  plot_size: 'Plot size',
  plot_size_unit: 'Plot size unit',
  plot_category: 'Plot category',
  possession_status: 'Possession',
  block: 'Block',
  sector: 'Sector / phase',
  plot_number: 'Plot number',
  development_name: 'Development / society',
  developer_name: 'Developer',
  corner_plot: 'Corner plot',
  park_facing: 'Park facing',
  main_road: 'Main road',
  boulevard: 'Boulevard',
  canal_facing: 'Canal facing',
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
  // Plot / land details. The asset class follows the subtype unless one was sent.
  if (has('propertySubtype')) {
    const subtype = text(body.propertySubtype, 40)
    if (!subtype) c.property_subtype = null
    else if (PROPERTY_SUBTYPES.some((s) => s.value === subtype)) {
      c.property_subtype = subtype
      if (!has('propertyType')) c.property_type = assetClassFor(subtype)
    } else problems.push('Choose what kind of property this is.')
  }
  if (has('plotSize')) {
    const size = amount(body.plotSize, 'Plot size', problems)
    if (size === 0) problems.push('Plot size must be greater than zero.')
    else c.plot_size = size
  }
  if (has('plotSizeUnit')) {
    const unit = text(body.plotSizeUnit, 12)
    if (unit && !isPlotSizeUnit(unit)) problems.push('Choose a plot size unit.')
    else c.plot_size_unit = unit || null
  }
  const oneOf = (key: string, column: string, allowed: { value: string }[], message: string) => {
    if (!has(key)) return
    const v = text(body[key], 40)
    if (v && !allowed.some((a) => a.value === v)) problems.push(message)
    else c[column] = v || null
  }
  oneOf('plotCategory', 'plot_category', PLOT_CATEGORIES, 'Choose a plot category.')
  oneOf('possessionStatus', 'possession_status', POSSESSION_STATUSES, 'Choose a possession status.')
  for (const [key, column, max] of [
    ['block', 'block', 60], ['sector', 'sector', 60], ['plotNumber', 'plot_number', 60],
    ['developmentName', 'development_name', 150], ['developerName', 'developer_name', 150],
  ] as const) {
    if (has(key)) c[column] = text(body[key], max) || null
  }
  for (const [key, column] of [
    ['cornerPlot', 'corner_plot'], ['parkFacing', 'park_facing'], ['mainRoad', 'main_road'],
    ['boulevard', 'boulevard'], ['canalFacing', 'canal_facing'],
  ] as const) {
    if (has(key)) c[column] = body[key] === true
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
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
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

// ── Payment plans ────────────────────────────────────────────────────────

export interface CleanPlan {
  name: string
  total_price: number | null
  down_payment: number | null
  currency: string
  duration_months: number | null
  notes: string | null
  installments: { installment_number: number; label: string | null; amount: number; additional_amount: number; due_after_months: number | null; display_order: number }[]
}

const money = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : NaN
}

/**
 * A payment plan as a partner's form sends it, validated. `null` plan means
 * "no payment plan" — an empty form, or one with nothing scheduled.
 * The figures are kept exactly as typed: a schedule that does not add up to
 * the price is reported to the admin, never adjusted.
 */
export function cleanPaymentPlan(input: unknown, fallbackCurrency = 'PKR'): { plan: CleanPlan | null; problems: string[] } {
  if (!input || typeof input !== 'object') return { plan: null, problems: [] }
  const b = input as Record<string, unknown>
  const problems: string[] = []
  const rows = Array.isArray(b.installments) ? b.installments.slice(0, 120) : []

  const installments = rows
    .map((raw) => (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}))
    .map((r) => ({
      label: text(r.label, 80) || null,
      amount: money(r.amount),
      additional_amount: money(r.additional_amount),
      due_after_months: r.due_after_months == null || r.due_after_months === '' ? null : Number(r.due_after_months),
    }))
    // A row with nothing in it is a blank line in the form, not an instalment.
    .filter((r) => r.amount != null || r.additional_amount != null || r.label)
    .map((r, i) => {
      if (Number.isNaN(r.amount) || Number.isNaN(r.additional_amount)) problems.push(`Instalment ${i + 1}: enter the amount as a number.`)
      if (r.due_after_months != null && (!Number.isFinite(r.due_after_months) || r.due_after_months < 0)) problems.push(`Instalment ${i + 1}: "due after" must be a number of months.`)
      return {
        installment_number: i + 1,
        label: r.label,
        amount: r.amount || 0,
        additional_amount: r.additional_amount || 0,
        due_after_months: r.due_after_months == null ? null : Math.round(r.due_after_months),
        display_order: i + 1,
      }
    })

  const total = money(b.total_price)
  const down = money(b.down_payment)
  if (Number.isNaN(total)) problems.push('Payment plan: enter the total price as a number.')
  if (Number.isNaN(down)) problems.push('Payment plan: enter the down payment as a number.')
  if (!installments.length && !down) return { plan: null, problems }

  const currency = CURRENCIES.includes(b.currency as string) ? (b.currency as string) : fallbackCurrency
  const duration = b.duration_months == null || b.duration_months === '' ? null : Math.round(Number(b.duration_months))
  const plan: CleanPlan = {
    name: text(b.name, 120) || 'Payment plan',
    total_price: total,
    down_payment: down,
    currency,
    duration_months: Number.isFinite(duration as number) && (duration as number) > 0
      ? duration
      : installments.reduce((m, r) => Math.max(m, r.due_after_months || 0), 0) || null,
    notes: text(b.notes, 1000) || null,
    installments,
  }
  if (!problems.length) problems.push(...validatePaymentPlan(plan))
  return { plan, problems }
}

/** A stored plan (row + instalments) in the same shape, for comparing with an edit. */
export function planFromStored(stored: Record<string, unknown> | null | undefined): CleanPlan | null {
  if (!stored) return null
  const num = (v: unknown) => (v == null ? null : Number(v))
  const rows = Array.isArray(stored.installments) ? (stored.installments as Record<string, unknown>[]) : []
  return {
    name: String(stored.name || 'Payment plan'),
    total_price: num(stored.total_price),
    down_payment: num(stored.down_payment),
    currency: String(stored.currency || 'PKR'),
    duration_months: num(stored.duration_months),
    notes: (stored.notes as string) || null,
    installments: rows.map((r, i) => ({
      installment_number: i + 1,
      label: (r.label as string) || null,
      amount: Number(r.amount) || 0,
      additional_amount: Number(r.additional_amount) || 0,
      due_after_months: num(r.due_after_months),
      display_order: i + 1,
    })),
  }
}

/** "Down payment PKR 500,000 + 12 instalments" — one line for a list or a review. */
export function describePlan(plan: CleanPlan | null | undefined): string {
  if (!plan) return 'No payment plan'
  const parts: string[] = []
  if (plan.down_payment) parts.push(`down payment ${plan.currency} ${plan.down_payment.toLocaleString('en-GB')}`)
  if (plan.installments.length) parts.push(`${plan.installments.length} instalment${plan.installments.length === 1 ? '' : 's'}`)
  const text_ = parts.join(' + ')
  return text_.charAt(0).toUpperCase() + text_.slice(1)
}
