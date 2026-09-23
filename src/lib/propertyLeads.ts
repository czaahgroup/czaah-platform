// CZAAH Properties leads (Phase 9). Every enquiry, viewing request and
// investment enquiry from the portal is stored as a property_leads row,
// linked to a CRM contact (one per email) and, once qualified, a CRM deal.

export const LEAD_KINDS = ['property_enquiry', 'viewing_request', 'investment_enquiry'] as const
export type LeadKind = (typeof LEAD_KINDS)[number]

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'viewing_booked', 'offer', 'won', 'lost', 'spam'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified', viewing_booked: 'Viewing booked',
  offer: 'Offer', won: 'Won', lost: 'Lost', spam: 'Spam',
}
export const LEAD_KIND_LABEL: Record<LeadKind, string> = {
  property_enquiry: 'Property enquiry', viewing_request: 'Viewing request', investment_enquiry: 'Investment enquiry',
}

export const VIEWING_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'] as const
export type ViewingStatus = (typeof VIEWING_STATUSES)[number]
export const VIEWING_SLOTS = ['Morning (9–12)', 'Afternoon (12–5)', 'Evening (5–8)', 'Any time']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CURRENCY = /^[A-Z]{3}$/

export interface CleanLead {
  kind: LeadKind
  name: string
  email: string
  phone: string | null
  message: string | null
  listing_id: string | null
  country: string | null
  city: string | null
  budget_amount: number | null
  budget_currency: string | null
  property_type: string | null
  funding: string | null
  purpose: string | null
  timeline: string | null
  source_page: string | null
  preferred_date: string | null
  preferred_slot: string | null
}

/** Validate a public lead submission. Unknown fields are ignored. */
export function cleanLead(body: unknown, today = new Date()): { data?: CleanLead; error?: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const text = (k: string, max: number) => {
    const v = b[k]
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t ? t.slice(0, max) : null
  }
  const kind = b.kind as LeadKind
  if (!LEAD_KINDS.includes(kind)) return { error: 'Unknown request type.' }
  const name = text('name', 200)
  const email = text('email', 254)?.toLowerCase() || null
  if (!name) return { error: 'Please enter your name.' }
  if (!email || !EMAIL.test(email)) return { error: 'Please enter a valid email address.' }

  const listing_id = typeof b.listing_id === 'string' && UUID.test(b.listing_id) ? b.listing_id : null
  if (kind !== 'investment_enquiry' && !listing_id) return { error: 'Which property is this about?' }

  const amount = Number(b.budget_amount)
  const budget_amount = b.budget_amount != null && b.budget_amount !== '' && Number.isFinite(amount) && amount > 0 && amount < 1e13 ? Math.round(amount) : null
  const currency = text('budget_currency', 3)?.toUpperCase() || null

  let preferred_date = text('preferred_date', 10)
  if (preferred_date) {
    const d = new Date(`${preferred_date}T00:00:00Z`)
    const floor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferred_date) || Number.isNaN(d.getTime()) || d < floor) preferred_date = null
  }
  const slot = text('preferred_slot', 40)

  const source = text('source_page', 500)
  return {
    data: {
      kind,
      name,
      email,
      phone: text('phone', 50),
      message: text('message', 5000),
      listing_id,
      country: text('country', 100),
      city: text('city', 100),
      budget_amount,
      budget_currency: budget_amount && currency && CURRENCY.test(currency) ? currency : null,
      property_type: text('property_type', 60),
      funding: text('funding', 60),
      purpose: text('purpose', 60),
      timeline: text('timeline', 60),
      // Only a same-site path is kept.
      source_page: source && /^\/[^/\\]/.test(source) ? source : null,
      preferred_date: kind === 'viewing_request' ? preferred_date : null,
      preferred_slot: kind === 'viewing_request' && slot && VIEWING_SLOTS.includes(slot) ? slot : null,
    },
  }
}

/** Short human reference for a listing: CZ- + first 8 hex of its id. */
export function listingRef(id: string) {
  return `CZ-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

/** The CRM deal a lead becomes when an admin qualifies it. */
export function dealFromLead(lead: { kind: LeadKind; listing_title: string | null; name: string; reference: string }, listing: { listing_type?: string | null; price?: number | null; currency?: string | null } | null) {
  const rental = listing?.listing_type === 'rent' || listing?.listing_type === 'lease'
  const kind = lead.kind === 'investment_enquiry' ? 'investment' : rental ? 'property_rental' : 'property_sale'
  const role = lead.kind === 'investment_enquiry' ? 'investor' : rental ? 'tenant' : 'buyer'
  const what = lead.listing_title || (lead.kind === 'investment_enquiry' ? 'Property investment' : 'Property')
  return {
    kind,
    role,
    title: `${what} — ${lead.name}`.slice(0, 200),
    value_amount: listing?.price ?? null,
    currency: listing?.currency && CURRENCY.test(listing.currency) ? listing.currency : null,
    description: `From CZAAH Properties lead ${lead.reference}.`,
  }
}
