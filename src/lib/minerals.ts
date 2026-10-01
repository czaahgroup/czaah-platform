import { CURRENCIES } from '@/lib/currencies'

/**
 * CZAAH Minerals (minerals.czaah.com): vocabulary and validation shared by
 * the public site, the partner forms, the admin page and every API route.
 *
 * An offer is one of four kinds. A supply offer is a mineral for sale and is
 * answered with a quote request; the other three are opportunities (a joint
 * venture, a licence, an investment) and are answered with an enquiry.
 * Pure module — safe for the client bundle.
 */

export const OFFER_TYPES = [
  { value: 'supply', label: 'For sale', hint: 'A mineral available to buy.' },
  { value: 'joint_venture', label: 'Joint venture', hint: 'A partner is sought to develop or operate.' },
  { value: 'licence', label: 'Licence available', hint: 'An exploration or mining licence on offer.' },
  { value: 'investment', label: 'Investment', hint: 'A project seeking capital.' },
] as const
export type OfferType = (typeof OFFER_TYPES)[number]['value']
export const OFFER_TYPE_LABEL: Record<string, string> = Object.fromEntries(OFFER_TYPES.map((t) => [t.value, t.label]))

// The same seven groups as the resource directory on czaah.com/sectors/minerals.
export const MINERAL_CATEGORIES = [
  { value: 'precious_metal', label: 'Precious metals' },
  { value: 'base_metal', label: 'Base metals' },
  { value: 'energy', label: 'Energy' },
  { value: 'industrial', label: 'Industrial minerals' },
  { value: 'gemstone', label: 'Gemstones' },
  { value: 'dimension_stone', label: 'Dimension stones' },
  { value: 'rare_earth', label: 'Rare earths' },
  { value: 'other', label: 'Other' },
] as const
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(MINERAL_CATEGORIES.map((c) => [c.value, c.label]))

export const QUANTITY_UNITS = [
  { value: 'MT', label: 'Metric tonnes (MT)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'oz', label: 'Troy ounces (oz)' },
  { value: 'carat', label: 'Carats' },
  { value: 'CBM', label: 'Cubic metres (CBM)' },
  { value: 'sq_m', label: 'Square metres' },
  { value: 'piece', label: 'Pieces' },
] as const
const UNITS = QUANTITY_UNITS.map((u) => u.value) as string[]

export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] as const

/** Status as a partner reads it. */
export const OFFER_STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting approval',
  approved: 'Live',
  rejected: 'Not approved',
  sold: 'Sold / closed',
  inactive: 'Withdrawn',
}

export const RFQ_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost', 'spam'] as const
export const RFQ_KIND_LABEL: Record<string, string> = {
  quote: 'Quote request',
  opportunity: 'Opportunity enquiry',
  sourcing: 'Sourcing request',
}

/** A sector that lets a partner list minerals (Admin → Partners → sector access). */
export const isMineralSector = (name: string | null | undefined) => !!name && /mineral|mining/i.test(name)

/** What the public may see of an offer. Never the seller, notes or who approved it. */
export const PUBLIC_OFFER_COLUMNS =
  'id, reference, offer_type, title, commodity, category, form, grade, origin_country, origin_region, quantity_available, quantity_unit, min_order, supply_capacity, price_amount, price_currency, incoterm, loading_port, packaging, description, images, has_assay_report, has_export_licence, verified, created_at'

export interface PublicOffer {
  id: string
  reference: string
  offer_type: OfferType
  title: string
  commodity: string
  category: string
  form: string | null
  grade: string | null
  origin_country: string
  origin_region: string | null
  quantity_available: number | null
  quantity_unit: string
  min_order: number | null
  supply_capacity: string | null
  price_amount: number | null
  price_currency: string
  incoterm: string | null
  loading_port: string | null
  packaging: string | null
  description: string | null
  images: string[]
  has_assay_report: boolean
  has_export_licence: boolean
  verified: boolean
  created_at: string
}

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

function amount(v: unknown, label: string, problems: string[]): number | null {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) {
    problems.push(`${label} must be a number.`)
    return null
  }
  // The table refuses zero; "not stated" is null.
  return n > 0 ? n : null
}

export interface CleanOffer {
  offer_type: OfferType
  title: string
  commodity: string
  category: string
  form: string | null
  grade: string | null
  origin_country: string
  origin_region: string | null
  quantity_available: number | null
  quantity_unit: string
  min_order: number | null
  supply_capacity: string | null
  price_amount: number | null
  price_currency: string
  incoterm: string | null
  loading_port: string | null
  packaging: string | null
  description: string | null
  has_assay_report: boolean
  has_export_licence: boolean
}

/**
 * An offer as a form sends it, validated. Only what a seller may state is
 * returned: status, verification and ownership are never taken from a form.
 * Photos are handled by the caller (they need storage checks).
 */
export function cleanOffer(body: unknown): { offer?: CleanOffer; problems: string[] } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const problems: string[] = []

  const offer_type = OFFER_TYPES.some((t) => t.value === b.offerType) ? (b.offerType as OfferType) : 'supply'
  const title = text(b.title, 160)
  const commodity = text(b.commodity, 80)
  const origin_country = text(b.originCountry, 80)
  if (!title) problems.push('A title is required.')
  if (!commodity) problems.push('Say which mineral this is.')
  if (!MINERAL_CATEGORIES.some((c) => c.value === b.category)) problems.push('Choose a category.')
  if (!origin_country) problems.push('Choose the country of origin.')

  const supply = offer_type === 'supply'
  const incoterm = text(b.incoterm, 3).toUpperCase()
  const offer: CleanOffer = {
    offer_type,
    title,
    commodity,
    category: String(b.category || ''),
    form: text(b.form, 80) || null,
    grade: text(b.grade, 160) || null,
    origin_country,
    origin_region: text(b.originRegion, 80) || null,
    quantity_available: amount(b.quantityAvailable, 'Quantity', problems),
    quantity_unit: UNITS.includes(b.quantityUnit as string) ? (b.quantityUnit as string) : 'MT',
    // Trade terms only mean something for a mineral that is for sale.
    min_order: supply ? amount(b.minOrder, 'Minimum order', problems) : null,
    supply_capacity: supply ? text(b.supplyCapacity, 120) || null : null,
    price_amount: amount(b.priceAmount, 'Price', problems),
    price_currency: CURRENCIES.includes(b.priceCurrency as string) ? (b.priceCurrency as string) : 'USD',
    incoterm: supply && (INCOTERMS as readonly string[]).includes(incoterm) ? incoterm : null,
    loading_port: supply ? text(b.loadingPort, 80) || null : null,
    packaging: supply ? text(b.packaging, 120) || null : null,
    description: text(b.description, 6000) || null,
    has_assay_report: b.hasAssayReport === true,
    has_export_licence: b.hasExportLicence === true,
  }
  return problems.length ? { problems } : { offer, problems }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface CleanRfq {
  offer_id: string | null
  name: string
  company: string | null
  email: string
  phone: string | null
  country: string | null
  commodity: string | null
  quantity: number | null
  quantity_unit: string | null
  incoterm: string | null
  destination_port: string | null
  message: string | null
  source_page: string | null
}

/** A quote request / enquiry from the public site. */
export function cleanRfq(body: unknown): { rfq?: CleanRfq; error?: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const name = text(b.name, 200)
  const email = text(b.email, 254).toLowerCase()
  if (!name) return { error: 'Please enter your name.' }
  if (!EMAIL.test(email)) return { error: 'Please enter a valid email address.' }

  const offer_id = typeof b.offer_id === 'string' && UUID.test(b.offer_id) ? b.offer_id : null
  const commodity = text(b.commodity, 80) || null
  const message = text(b.message, 5000) || null
  // Without an offer there is nothing to quote unless they say what they want.
  if (!offer_id && !commodity && !message) return { error: 'Tell us which mineral you are looking for.' }

  const problems: string[] = []
  const quantity = amount(b.quantity, 'Quantity', problems)
  if (problems.length) return { error: problems[0] }
  const incoterm = text(b.incoterm, 3).toUpperCase()
  const source = text(b.source_page, 300)
  return {
    rfq: {
      offer_id,
      name,
      company: text(b.company, 160) || null,
      email,
      phone: text(b.phone, 40) || null,
      country: text(b.country, 80) || null,
      commodity,
      quantity,
      quantity_unit: quantity && UNITS.includes(b.quantity_unit as string) ? (b.quantity_unit as string) : null,
      incoterm: (INCOTERMS as readonly string[]).includes(incoterm) ? incoterm : null,
      destination_port: text(b.destination_port, 120) || null,
      message,
      // Same-site paths only: this is shown to an admin as a link.
      source_page: source.startsWith('/') && !source.startsWith('//') ? source : null,
    },
  }
}

/**
 * What the owner may do to an offer's status without asking anyone. Taking an
 * offer off the site needs no approval; putting one on always does.
 */
export type MineralAction = 'mark_sold' | 'withdraw' | 'relist'

export function mineralActionResult(action: unknown, status: string): { status?: string; error?: string } {
  if (action === 'mark_sold') return status === 'approved' ? { status: 'sold' } : { error: 'Only a live offer can be marked as sold or closed.' }
  if (action === 'withdraw') return status === 'approved' || status === 'pending' ? { status: 'inactive' } : { error: 'This offer is not on the site.' }
  if (action === 'relist') return ['sold', 'inactive', 'rejected'].includes(status) ? { status: 'pending' } : { error: 'This offer is already live or awaiting approval.' }
  return { error: 'Unknown action.' }
}

/** "USD 320 / MT" — or null when no price is stated (the site then says "Price on request"). */
export function offerPrice(o: Pick<PublicOffer, 'price_amount' | 'price_currency' | 'quantity_unit' | 'offer_type'>): string | null {
  if (!o.price_amount) return null
  const figure = `${o.price_currency} ${Number(o.price_amount).toLocaleString('en-GB')}`
  return o.offer_type === 'supply' ? `${figure} / ${unitShort(o.quantity_unit)}` : figure
}

export const unitShort = (unit: string | null | undefined) => (unit === 'sq_m' ? 'm²' : unit === 'piece' ? 'piece' : unit || 'MT')

/** "5,000 MT" */
export function offerQuantity(amount_: number | null | undefined, unit: string | null | undefined): string | null {
  if (!amount_) return null
  return `${Number(amount_).toLocaleString('en-GB')} ${unitShort(unit)}`
}

/** A stored photo path as a URL (the property-images bucket is public). */
export function mineralImage(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http') || path.startsWith('/')) return path
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${path}`
}
