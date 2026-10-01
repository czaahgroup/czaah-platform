'use client'

import { useState } from 'react'
import { PORTAL_COUNTRIES } from '@/app/property-portal/_components/types'
import { PhotoUploader, FeatureChips, splitPaths } from '@/components/PhotoUploader'
import { PARTNER_MAX_PHOTOS } from '@/lib/uploadSafety'
import { CURRENCIES } from '@/lib/currencies'
import { PROPERTY_SUBTYPES, PLOT_SIZE_UNITS, PLOT_CATEGORIES, POSSESSION_STATUSES } from '@/lib/plots'
import type { CleanPlan } from '@/lib/listingEdits'
import { PaymentPlanEditor, EMPTY_PLAN, planDraftFrom, planPayload, type PlanDraft } from './PaymentPlanEditor'

// One "what is it?" question. Most answers are a subtype (the asset class is
// derived from it); industrial has no subtype, so it is sent as the class.
const KINDS = [
  ...PROPERTY_SUBTYPES.map((s) => ({ value: s.value as string, label: s.label, land: s.isLand })),
  { value: 'industrial', label: 'Industrial / Warehouse', land: false },
]
// Listings made before subtypes existed only have an asset class.
const LEGACY_KINDS: Record<string, string> = { residential: 'Residential', commercial: 'Commercial', land: 'Land', mixed_use: 'Mixed use' }
const isLandKind = (kind: string) => kind === 'land' || !!KINDS.find((k) => k.value === kind)?.land

const LISTING_TYPES = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
  { value: 'lease', label: 'For Lease' },
  { value: 'off_plan', label: 'Off-Plan' },
]

const PLOT_FLAGS = [
  ['cornerPlot', 'Corner plot'],
  ['parkFacing', 'Park facing'],
  ['mainRoad', 'Main road'],
  ['boulevard', 'Boulevard'],
  ['canalFacing', 'Canal facing'],
] as const

const inputClass = 'bg-surface-container border border-outline-variant/20 px-3 py-2.5 text-base sm:text-sm text-on-surface raleway-text w-full focus:border-primary outline-none transition-colors'
const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'
const cardClass = 'bg-surface-container border border-outline-variant/10 px-5 py-5 sm:px-6 sm:py-6 mb-5'
const headingClass = 'cinzel-text text-sm tracking-[0.15em] uppercase text-primary/80 mb-5'

export interface PropertyFormValues {
  title: string
  kind: string
  listingType: string
  price: string
  currency: string
  location: string
  city: string
  country: string
  areaSqft: string
  bedrooms: string
  bathrooms: string
  description: string
  features: string
  rentPeriod: string
  furnishing: string
  availableFrom: string
  deposit: string
  minTermMonths: string
  photos: string
  plotSize: string
  plotSizeUnit: string
  plotCategory: string
  possessionStatus: string
  block: string
  sector: string
  plotNumber: string
  developmentName: string
  developerName: string
  cornerPlot: boolean
  parkFacing: boolean
  mainRoad: boolean
  boulevard: boolean
  canalFacing: boolean
  plan: PlanDraft
}

export const EMPTY_PROPERTY: PropertyFormValues = {
  title: '', kind: '', listingType: '', price: '', currency: 'PKR',
  location: '', city: '', country: '', areaSqft: '', bedrooms: '', bathrooms: '',
  description: '', features: '', rentPeriod: 'month', furnishing: '', availableFrom: '',
  deposit: '', minTermMonths: '', photos: '',
  plotSize: '', plotSizeUnit: 'marla', plotCategory: '', possessionStatus: '',
  block: '', sector: '', plotNumber: '', developmentName: '', developerName: '',
  cornerPlot: false, parkFacing: false, mainRoad: false, boulevard: false, canalFacing: false,
  plan: EMPTY_PLAN,
}

const str = (v: unknown) => (v == null ? '' : String(v))

/** A listing row (snake_case, as the API returns it) as form values. */
export function formFromListing(row: Record<string, unknown>): PropertyFormValues {
  return {
    title: str(row.title),
    kind: str(row.property_subtype) || str(row.property_type),
    listingType: str(row.listing_type),
    price: str(row.price),
    currency: str(row.currency) || 'PKR',
    location: str(row.location),
    city: str(row.city),
    country: str(row.country),
    areaSqft: str(row.area_sqft),
    bedrooms: str(row.bedrooms),
    bathrooms: str(row.bathrooms),
    description: str(row.description),
    features: Array.isArray(row.features) ? row.features.join(', ') : '',
    rentPeriod: str(row.rent_period) || 'month',
    furnishing: str(row.furnishing),
    availableFrom: str(row.available_from).slice(0, 10),
    deposit: str(row.deposit),
    minTermMonths: str(row.min_term_months),
    photos: Array.isArray(row.images) ? row.images.join(', ') : '',
    plotSize: str(row.plot_size),
    plotSizeUnit: str(row.plot_size_unit) || 'marla',
    plotCategory: str(row.plot_category),
    possessionStatus: str(row.possession_status),
    block: str(row.block),
    sector: str(row.sector),
    plotNumber: str(row.plot_number),
    developmentName: str(row.development_name),
    developerName: str(row.developer_name),
    cornerPlot: row.corner_plot === true,
    parkFacing: row.park_facing === true,
    mainRoad: row.main_road === true,
    boulevard: row.boulevard === true,
    canalFacing: row.canal_facing === true,
    plan: planDraftFrom(row.payment_plan as CleanPlan | null | undefined),
  }
}

/** Form values as the body the partner listing API expects. */
export function payloadFromForm(form: PropertyFormValues) {
  const { photos, kind, plan, ...fields } = form
  const subtype = PROPERTY_SUBTYPES.find((s) => s.value === kind)
  const land = isLandKind(kind)
  return {
    ...fields,
    propertySubtype: subtype ? kind : '',
    propertyType: subtype ? subtype.assetClass : kind,
    images: splitPaths(photos),
    // A plot has no rooms; a building has no plot details. Clearing the other
    // set stops values from an earlier choice lingering on the listing.
    ...(land
      ? { bedrooms: '', bathrooms: '' }
      : { plotSize: '', plotSizeUnit: '', plotCategory: '', block: '', sector: '', plotNumber: '', cornerPlot: false, parkFacing: false, mainRoad: false, boulevard: false, canalFacing: false }),
    // Rentals have no purchase schedule; the section is hidden for them.
    paymentPlan: form.listingType === 'rent' || form.listingType === 'lease' ? null : planPayload(plan, form.price, form.currency),
  }
}

/**
 * The add / edit property form. The page decides what saving means (create,
 * save, or send for approval) and passes the wording in.
 */
export function PropertyForm({
  initial,
  submitLabel,
  busyLabel,
  onSubmit,
  onCancel,
}: {
  initial: PropertyFormValues
  submitLabel: string
  busyLabel: string
  /** Resolves to an error message, or nothing on success. */
  onSubmit: (values: PropertyFormValues) => Promise<string | void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadsInFlight, setUploadsInFlight] = useState(0)
  const set = <K extends keyof PropertyFormValues>(key: K, value: PropertyFormValues[K]) => setForm((prev) => ({ ...prev, [key]: value }))
  const rental = form.listingType === 'rent' || form.listingType === 'lease'
  const land = isLandKind(form.kind)
  const countries = form.country && !PORTAL_COUNTRIES.includes(form.country) ? [form.country, ...PORTAL_COUNTRIES] : PORTAL_COUNTRIES
  const kinds = form.kind && !KINDS.some((k) => k.value === form.kind)
    ? [{ value: form.kind, label: LEGACY_KINDS[form.kind] || form.kind, land: form.kind === 'land' }, ...KINDS]
    : KINDS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const problem = await onSubmit(form)
    if (problem) {
      setError(problem)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={cardClass}>
        <h2 className={headingClass}>Basic details</h2>
        <div className="mb-4">
          <label className={labelClass} htmlFor="pf-title">Title *</label>
          <input id="pf-title" className={inputClass} required maxLength={160} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. 10 Marla Plot, Bahria Town" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass} htmlFor="pf-type">What is it? *</label>
            <select id="pf-type" className={inputClass} required value={form.kind} onChange={(e) => set('kind', e.target.value)}>
              <option value="">Select…</option>
              {kinds.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-listing">Listing type *</label>
            <select id="pf-listing" className={inputClass} required value={form.listingType} onChange={(e) => set('listingType', e.target.value)}>
              <option value="">Select…</option>
              {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="pf-price">{rental ? 'Rent' : 'Price'}</label>
            <input id="pf-price" className={inputClass} type="number" min={0} inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder={land ? 'Needed unless there is a payment plan' : 'Leave empty for price on request'} />
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-ccy">Currency</label>
            <select id="pf-ccy" className={inputClass} value={form.currency} onChange={(e) => set('currency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {rental && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className={labelClass} htmlFor="pf-period">Rent is per</label>
              <select id="pf-period" className={inputClass} value={form.rentPeriod} onChange={(e) => set('rentPeriod', e.target.value)}>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-deposit">Deposit</label>
              <input id="pf-deposit" className={inputClass} type="number" min={0} inputMode="decimal" value={form.deposit} onChange={(e) => set('deposit', e.target.value)} placeholder="Same currency as rent" />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-term">Min. term (months)</label>
              <input id="pf-term" className={inputClass} type="number" min={1} inputMode="numeric" value={form.minTermMonths} onChange={(e) => set('minTermMonths', e.target.value)} placeholder="e.g. 12" />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-furnishing">Furnishing</label>
              <select id="pf-furnishing" className={inputClass} value={form.furnishing} onChange={(e) => set('furnishing', e.target.value)}>
                <option value="">Not stated</option>
                <option value="furnished">Furnished</option>
                <option value="part_furnished">Part furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-available">Available from</label>
              <input id="pf-available" className={inputClass} type="date" value={form.availableFrom} onChange={(e) => set('availableFrom', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {land && (
        <div className={cardClass}>
          <h2 className={headingClass}>Plot details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelClass} htmlFor="pf-plot-size">Plot size *</label>
              <input id="pf-plot-size" className={inputClass} type="number" min={0} step="any" inputMode="decimal" required value={form.plotSize} onChange={(e) => set('plotSize', e.target.value)} placeholder="e.g. 10" />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-plot-unit">Unit *</label>
              <select id="pf-plot-unit" className={inputClass} required value={form.plotSizeUnit} onChange={(e) => set('plotSizeUnit', e.target.value)}>
                {PLOT_SIZE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-plot-category">Category *</label>
              <select id="pf-plot-category" className={inputClass} required value={form.plotCategory} onChange={(e) => set('plotCategory', e.target.value)}>
                <option value="">Select…</option>
                {PLOT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelClass} htmlFor="pf-block">Block</label>
              <input id="pf-block" className={inputClass} maxLength={60} value={form.block} onChange={(e) => set('block', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-sector">Sector / phase</label>
              <input id="pf-sector" className={inputClass} maxLength={60} value={form.sector} onChange={(e) => set('sector', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-plot-number">Plot number</label>
              <input id="pf-plot-number" className={inputClass} maxLength={60} value={form.plotNumber} onChange={(e) => set('plotNumber', e.target.value)} />
            </div>
          </div>
          <div className="mb-4">
            <label className={labelClass} htmlFor="pf-possession">Possession</label>
            <select id="pf-possession" className={inputClass} value={form.possessionStatus} onChange={(e) => set('possessionStatus', e.target.value)}>
              <option value="">Not stated</option>
              {POSSESSION_STATUSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {PLOT_FLAGS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-on-surface-variant px-3 py-2.5 border border-outline-variant/20 cursor-pointer">
                <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className={cardClass}>
        <h2 className={headingClass}>Location{land ? '' : ' & size'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass} htmlFor="pf-country">Country *</label>
            <select id="pf-country" className={inputClass} required value={form.country} onChange={(e) => set('country', e.target.value)}>
              <option value="">Select a country…</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-city">City *</label>
            <input id="pf-city" className={inputClass} required maxLength={80} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Islamabad" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="pf-location">Area / location *</label>
            <input id="pf-location" className={inputClass} required maxLength={160} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Blue Area" />
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-development">Development / society</label>
            <input id="pf-development" className={inputClass} maxLength={150} value={form.developmentName} onChange={(e) => set('developmentName', e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-developer">Developer</label>
            <input id="pf-developer" className={inputClass} maxLength={150} value={form.developerName} onChange={(e) => set('developerName', e.target.value)} placeholder="Optional" />
          </div>
        </div>
        {!land && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass} htmlFor="pf-area">Area (sq ft)</label>
              <input id="pf-area" className={inputClass} type="number" min={0} inputMode="decimal" value={form.areaSqft} onChange={(e) => set('areaSqft', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-beds">Bedrooms</label>
              <input id="pf-beds" className={inputClass} type="number" min={0} inputMode="numeric" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-baths">Bathrooms</label>
              <input id="pf-baths" className={inputClass} type="number" min={0} inputMode="numeric" value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {!rental && (
        <div className={cardClass}>
          <h2 className={headingClass}>Payment plan</h2>
          <PaymentPlanEditor value={form.plan} onChange={(plan) => set('plan', plan)} price={form.price} currency={form.currency} />
        </div>
      )}

      <div className={cardClass}>
        <h2 className={headingClass}>Description &amp; features</h2>
        <div className="mb-4">
          <label className={labelClass} htmlFor="pf-description">Description</label>
          <textarea id="pf-description" className={inputClass} rows={5} maxLength={5000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the property and its surroundings." />
        </div>
        <div>
          <label className={labelClass} htmlFor="pf-features">Features</label>
          <input id="pf-features" className={inputClass} value={form.features} onChange={(e) => set('features', e.target.value)} placeholder="Tap below, or type your own separated by commas" />
          <FeatureChips value={form.features} onChange={(v) => set('features', v)} />
        </div>
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>Photos{land ? ' *' : ''}</h2>
        {land && <p className="text-xs text-on-surface-variant/60 mb-3">A plot needs at least one photo or site plan.</p>}
        <PhotoUploader
          value={form.photos}
          title={form.title}
          onChange={(v) => set('photos', v)}
          onBusyChange={(busy) => setUploadsInFlight((n) => Math.max(0, n + (busy ? 1 : -1)))}
          endpoint="/api/partner/media/upload-url"
          maxPhotos={PARTNER_MAX_PHOTOS}
          allowLinks={false}
        />
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5"><p className="text-sm text-red-400">{error}</p></div>}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-5 py-3 text-sm raleway-text border border-outline-variant/20 text-on-surface-variant hover:text-on-surface transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={submitting || uploadsInFlight > 0} className="px-6 py-3 text-sm raleway-text font-semibold bg-primary text-on-primary disabled:opacity-50">
          {uploadsInFlight > 0 ? 'Uploading photos…' : submitting ? busyLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}
