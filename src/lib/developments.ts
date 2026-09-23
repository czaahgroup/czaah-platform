import type { SupabaseClient } from '@supabase/supabase-js'
import { logError } from '@/lib/logError'
import { reconcilePaymentPlan, validatePaymentPlan, type InstallmentInput } from '@/lib/paymentPlan'

// Shared server-side plumbing for developments, their plot variants and the
// payment plans hanging off either. Kept out of the route files so the admin
// API, the public API and the seed script all behave identically.

export const DEVELOPMENT_COLUMNS = `
  id, name, slug, developer_name, marketing_agent, description,
  country, province_state, city, area, address, latitude, longitude,
  approval_status, approval_authority, featured_image, gallery, features,
  video_url, video_poster_url, brochure_url, brochure_name,
  currency, development_status, possession_status, status, featured, verified,
  agent_id, developer_id, created_at, updated_at
`

export const UNIT_COLUMNS = `
  id, development_id, title, property_type, property_subtype,
  plot_size, plot_size_unit, plot_category, bedrooms, bathrooms, area_sqft,
  total_price, currency, availability_status, possession_status,
  block, sector, plot_number,
  corner_plot, park_facing, main_road, boulevard, canal_facing,
  description, images, display_order, created_at, updated_at
`

/** Columns the portal needs from property_listings, including the plot set. */
export const LISTING_COLUMNS = `
  id, title, property_type, property_subtype, listing_type, price, currency,
  location, city, country, province_state, address, latitude, longitude,
  area_sqft, bedrooms, bathrooms, description, features, images,
  video_url, video_poster_url, rent_period, furnishing, available_from,
  deposit, min_term_months, yield_percentage, yield_source,
  tenure, lease_years_remaining, council_tax_band, service_charge, ground_rent,
  build_status, completion_date, society, phase,
  plot_size, plot_size_unit, plot_category, development_name, developer_name,
  marketing_agent, block, sector, plot_number, price_type,
  possession_status, development_status,
  corner_plot, park_facing, main_road, boulevard, canal_facing,
  approved, approval_authority, featured, verified,
  development_id, development_unit_id, created_at
`

// Marketing images only, and world-readable. platform-files is private and
// also holds deal/investment/enquiry documents, so it must not be used here.
export const STORAGE_BUCKET = 'property-images'

/**
 * Accepts what the admin form sends for images and video: either a data URL /
 * raw base64 (uploaded here) or an existing storage path / absolute URL (kept
 * as is). Returns storage paths — never base64, which must not reach the
 * database.
 */
export async function persistMedia(
  supabase: SupabaseClient,
  images: unknown,
  prefix: string
): Promise<string[]> {
  if (!Array.isArray(images)) return []
  const out: string[] = []

  for (let i = 0; i < images.length && i < 20; i++) {
    const img = images[i]
    if (typeof img !== 'string' || !img) continue

    // Already stored, or an external URL the editor pasted in.
    if (!img.startsWith('data:') && !isProbablyBase64(img)) {
      out.push(img)
      continue
    }

    let base64Data = img
    let contentType = 'image/jpeg'
    if (img.startsWith('data:')) {
      const match = img.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) continue
      contentType = match[1]
      base64Data = match[2]
    }

    const buffer = Buffer.from(base64Data, 'base64')
    const ext = (contentType.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '')
    const filePath = `${prefix}/${Date.now()}_${i}.${ext}`

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, { contentType, upsert: false })

    if (error) {
      logError('lib.developments.persistMedia', error, { index: i, prefix })
      continue
    }
    out.push(filePath)
  }

  return out
}

/**
 * Deletes files that were dropped from a record. Only touches paths inside our
 * own bucket, and only ones no longer referenced — an absolute URL or a path
 * still in use is left alone.
 */
export async function removeOrphanedMedia(
  supabase: SupabaseClient,
  before: (string | null | undefined)[],
  after: (string | null | undefined)[]
): Promise<void> {
  const kept = new Set(after.filter(Boolean) as string[])
  const orphans = (before.filter(Boolean) as string[]).filter(
    (p) => !kept.has(p) && !p.startsWith('http') && !p.startsWith('/') && !p.startsWith('data:')
  )
  if (!orphans.length) return
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(orphans)
  if (error) logError('lib.developments.removeOrphanedMedia', error, { count: orphans.length })
}

// A storage path looks like "developments/x/123.jpg"; base64 has no slashes
// near the start and is long. Only used to catch a raw (non data-URL) blob.
function isProbablyBase64(value: string): boolean {
  return value.length > 512 && !value.includes('/') && /^[A-Za-z0-9+/=\s]+$/.test(value)
}

export interface PaymentPlanPayload {
  name?: string | null
  total_price?: number | string | null
  down_payment?: number | string | null
  currency?: string | null
  duration_months?: number | null
  notes?: string | null
  installments?: InstallmentInput[] | null
}

export interface SavePlanResult {
  planId: string | null
  /** Non-null when the schedule does not match the advertised total price. */
  warning: string | null
  errors: string[]
}

/**
 * Replaces the payment plan for a listing or a development unit.
 *
 * Deliberately destructive on the plan itself (delete then insert) — a plan is
 * a single advertised schedule, and diffing instalment rows would leave orphans
 * when a developer reissues a shorter one. The advertised numbers are stored
 * exactly as given; any mismatch comes back as a warning for an admin to judge.
 */
export async function savePaymentPlan(
  supabase: SupabaseClient,
  owner: { propertyId?: string | null; developmentUnitId?: string | null },
  plan: PaymentPlanPayload | null | undefined
): Promise<SavePlanResult> {
  const { propertyId, developmentUnitId } = owner
  if (!propertyId && !developmentUnitId) {
    return { planId: null, warning: null, errors: ['A payment plan needs a listing or a unit to belong to.'] }
  }
  if (propertyId && developmentUnitId) {
    return { planId: null, warning: null, errors: ['A payment plan cannot belong to both a listing and a unit.'] }
  }

  const match = propertyId ? { property_id: propertyId } : { development_unit_id: developmentUnitId! }

  // No plan supplied means "remove the plan".
  if (!plan) {
    await supabase.from('property_payment_plans').delete().match(match)
    return { planId: null, warning: null, errors: [] }
  }

  const errors = validatePaymentPlan(plan)
  if (errors.length) return { planId: null, warning: null, errors }

  await supabase.from('property_payment_plans').delete().match(match)

  const { data: inserted, error: planError } = await supabase
    .from('property_payment_plans')
    .insert({
      ...match,
      name: plan.name || 'Payment plan',
      total_price: toNullableNumber(plan.total_price),
      down_payment: toNullableNumber(plan.down_payment),
      currency: plan.currency || 'PKR',
      duration_months: plan.duration_months ?? null,
      notes: plan.notes || null,
    })
    .select('id')
    .single()

  if (planError || !inserted) {
    return { planId: null, warning: null, errors: [planError?.message || 'Could not save the payment plan.'] }
  }

  const rows = (plan.installments || []).map((r, i) => ({
    payment_plan_id: inserted.id,
    installment_number: r.installment_number ?? i + 1,
    label: r.label || null,
    amount: toNullableNumber(r.amount) ?? 0,
    additional_amount: toNullableNumber(r.additional_amount) ?? 0,
    due_after_months: r.due_after_months ?? null,
    display_order: r.display_order ?? i + 1,
    notes: r.notes || null,
  }))

  if (rows.length) {
    const { error: rowError } = await supabase.from('property_payment_installments').insert(rows)
    if (rowError) {
      return { planId: inserted.id, warning: null, errors: [rowError.message] }
    }
  }

  const reconciliation = reconcilePaymentPlan(plan)
  return { planId: inserted.id, warning: reconciliation.warning, errors: [] }
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/** Loads the plans + instalments for a set of units, keyed by unit id. */
export async function loadPlansForUnits(supabase: SupabaseClient, unitIds: string[]) {
  const byUnit: Record<string, { plan: Record<string, unknown>; installments: unknown[] }> = {}
  if (!unitIds.length) return byUnit

  const { data: plans } = await supabase
    .from('property_payment_plans')
    .select('*')
    .in('development_unit_id', unitIds)

  if (!plans?.length) return byUnit

  const { data: installments } = await supabase
    .from('property_payment_installments')
    .select('*')
    .in('payment_plan_id', plans.map((p) => p.id))
    .order('display_order', { ascending: true })

  for (const plan of plans) {
    byUnit[plan.development_unit_id] = {
      plan,
      installments: (installments || []).filter((r) => r.payment_plan_id === plan.id),
    }
  }
  return byUnit
}

/** Loads the plan + instalments for a single standalone listing. */
export async function loadPlanForListing(supabase: SupabaseClient, propertyId: string) {
  const { data: plan } = await supabase
    .from('property_payment_plans')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle()

  if (!plan) return null

  const { data: installments } = await supabase
    .from('property_payment_installments')
    .select('*')
    .eq('payment_plan_id', plan.id)
    .order('display_order', { ascending: true })

  return { ...plan, installments: installments || [] }
}

/**
 * Makes a slug unique by appending -2, -3 … Slugs are the public URL, so a
 * collision would quietly overwrite which development a link points at.
 */
export async function uniqueSlug(supabase: SupabaseClient, base: string, ignoreId?: string): Promise<string> {
  const root = base || 'development'
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`
    let query = supabase.from('developments').select('id').eq('slug', candidate)
    if (ignoreId) query = query.neq('id', ignoreId)
    const { data } = await query.maybeSingle()
    if (!data) return candidate
  }
  return `${root}-${Date.now()}`
}

export interface UnitPayload {
  title?: string
  propertyType?: string
  propertySubtype?: string
  plotSize?: number | string | null
  plotSizeUnit?: string | null
  plotCategory?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  areaSqft?: number | null
  totalPrice?: number | string | null
  currency?: string | null
  availabilityStatus?: string | null
  possessionStatus?: string | null
  block?: string | null
  sector?: string | null
  plotNumber?: string | null
  cornerPlot?: boolean
  parkFacing?: boolean
  mainRoad?: boolean
  boulevard?: boolean
  canalFacing?: boolean
  description?: string | null
  displayOrder?: number | null
  paymentPlan?: PaymentPlanPayload | null
}

/** Columns a unit payload maps onto, shared by insert and update. */
function unitColumns(unit: UnitPayload, index: number, fallbackCurrency: string) {
  return {
    title: unit.title?.trim(),
    property_type: unit.propertyType || 'land',
    property_subtype: unit.propertySubtype || 'plot',
    plot_size: toNullableNumber(unit.plotSize),
    plot_size_unit: unit.plotSizeUnit || null,
    plot_category: unit.plotCategory || null,
    bedrooms: unit.bedrooms ?? null,
    bathrooms: unit.bathrooms ?? null,
    area_sqft: toNullableNumber(unit.areaSqft),
    total_price: toNullableNumber(unit.totalPrice),
    currency: unit.currency || fallbackCurrency,
    availability_status: unit.availabilityStatus || 'available',
    possession_status: unit.possessionStatus || null,
    block: unit.block || null,
    sector: unit.sector || null,
    plot_number: unit.plotNumber || null,
    corner_plot: !!unit.cornerPlot,
    park_facing: !!unit.parkFacing,
    main_road: !!unit.mainRoad,
    boulevard: !!unit.boulevard,
    canal_facing: !!unit.canalFacing,
    description: unit.description || null,
    display_order: unit.displayOrder ?? index + 1,
  }
}

/** Insert one plot variant plus its optional payment plan. */
export async function insertUnit(
  supabase: SupabaseClient,
  developmentId: string,
  unit: UnitPayload,
  index: number,
  fallbackCurrency = 'PKR'
): Promise<{ id?: string; warning?: string | null; error?: string }> {
  if (!unit.title) return { error: 'title is required' }

  const { data, error } = await supabase
    .from('development_units')
    .insert({ development_id: developmentId, ...unitColumns(unit, index, fallbackCurrency) })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message || 'Could not create unit' }

  if (unit.paymentPlan) {
    const plan = await savePaymentPlan(supabase, { developmentUnitId: data.id }, unit.paymentPlan)
    if (plan.errors.length) return { id: data.id, error: plan.errors.join(' ') }
    return { id: data.id, warning: plan.warning }
  }
  return { id: data.id, warning: null }
}

/** Update one plot variant; a supplied paymentPlan replaces the existing one. */
export async function updateUnit(
  supabase: SupabaseClient,
  unitId: string,
  unit: UnitPayload,
  fallbackCurrency = 'PKR'
): Promise<{ warning?: string | null; error?: string }> {
  const columns = unitColumns(unit, 0, fallbackCurrency)
  // display_order defaults to 1 on a partial update, which would reshuffle the
  // list; only write it when the caller actually sent one.
  if (unit.displayOrder == null) delete (columns as Record<string, unknown>).display_order
  if (unit.title == null) delete (columns as Record<string, unknown>).title

  const { error } = await supabase.from('development_units').update(columns).eq('id', unitId)
  if (error) return { error: error.message }

  if (unit.paymentPlan !== undefined) {
    const plan = await savePaymentPlan(supabase, { developmentUnitId: unitId }, unit.paymentPlan)
    if (plan.errors.length) return { error: plan.errors.join(' ') }
    return { warning: plan.warning }
  }
  return { warning: null }
}

/**
 * The plot / subtype columns a listing body maps onto.
 *
 * `mode: 'insert'` returns every column (so defaults land); `'update'`
 * returns only the keys actually present in the body, so a partial save can
 * never blank a field the form didn't show.
 */
export function plotColumnsFromBody(
  body: Record<string, unknown>,
  mode: 'insert' | 'update' = 'insert'
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const has = (key: string) => body[key] !== undefined

  const text = (key: string, column: string) => {
    if (mode === 'insert' || has(key)) {
      const value = typeof body[key] === 'string' ? (body[key] as string).trim() : body[key]
      out[column] = (value as string) || null
    }
  }
  const bool = (key: string, column: string) => {
    if (mode === 'insert' || has(key)) out[column] = !!body[key]
  }
  const number = (key: string, column: string) => {
    if (mode === 'insert' || has(key)) out[column] = toNullableNumber(body[key] as number | string | null)
  }

  text('propertySubtype', 'property_subtype')
  text('provinceState', 'province_state')
  text('address', 'address')
  number('latitude', 'latitude')
  number('longitude', 'longitude')
  number('plotSize', 'plot_size')
  text('plotSizeUnit', 'plot_size_unit')
  text('plotCategory', 'plot_category')
  text('developmentName', 'development_name')
  text('developerName', 'developer_name')
  text('marketingAgent', 'marketing_agent')
  text('block', 'block')
  text('sector', 'sector')
  text('plotNumber', 'plot_number')
  text('priceType', 'price_type')
  text('possessionStatus', 'possession_status')
  text('developmentStatus', 'development_status')
  text('approvalAuthority', 'approval_authority')
  text('developmentId', 'development_id')
  text('developmentUnitId', 'development_unit_id')
  bool('cornerPlot', 'corner_plot')
  bool('parkFacing', 'park_facing')
  bool('mainRoad', 'main_road')
  bool('boulevard', 'boulevard')
  bool('canalFacing', 'canal_facing')
  bool('approved', 'approved')
  bool('featured', 'featured')
  // 'verified' is set only through Admin → Verification (checks + record).

  return out
}
