'use client'

import { useState } from 'react'
import { PORTAL_COUNTRIES } from '@/app/property-portal/_components/types'
import { PhotoUploader, FeatureChips, splitPaths } from '@/components/PhotoUploader'
import { PARTNER_MAX_PHOTOS } from '@/lib/uploadSafety'
import { CURRENCIES } from '@/lib/currencies'

const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'land', label: 'Land' },
  { value: 'mixed_use', label: 'Mixed Use' },
]

const LISTING_TYPES = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
  { value: 'lease', label: 'For Lease' },
  { value: 'off_plan', label: 'Off-Plan' },
]

const inputClass = 'bg-surface-container border border-outline-variant/20 px-3 py-2.5 text-base sm:text-sm text-on-surface raleway-text w-full focus:border-primary outline-none transition-colors'
const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'
const cardClass = 'bg-surface-container border border-outline-variant/10 px-5 py-5 sm:px-6 sm:py-6 mb-5'
const headingClass = 'cinzel-text text-sm tracking-[0.15em] uppercase text-primary/80 mb-5'

export interface PropertyFormValues {
  title: string
  propertyType: string
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
}

export const EMPTY_PROPERTY: PropertyFormValues = {
  title: '', propertyType: '', listingType: '', price: '', currency: 'PKR',
  location: '', city: '', country: '', areaSqft: '', bedrooms: '', bathrooms: '',
  description: '', features: '', rentPeriod: 'month', furnishing: '', availableFrom: '',
  deposit: '', minTermMonths: '', photos: '',
}

const str = (v: unknown) => (v == null ? '' : String(v))

/** A listing row (snake_case, as the API returns it) as form values. */
export function formFromListing(row: Record<string, unknown>): PropertyFormValues {
  return {
    title: str(row.title),
    propertyType: str(row.property_type),
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
  }
}

/** Form values as the body the partner listing API expects. */
export function payloadFromForm(form: PropertyFormValues) {
  const { photos, ...fields } = form
  return { ...fields, images: splitPaths(photos) }
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
  const set = (key: keyof PropertyFormValues, value: string) => setForm((prev) => ({ ...prev, [key]: value }))
  const rental = form.listingType === 'rent' || form.listingType === 'lease'
  const countries = form.country && !PORTAL_COUNTRIES.includes(form.country) ? [form.country, ...PORTAL_COUNTRIES] : PORTAL_COUNTRIES

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
          <input id="pf-title" className={inputClass} required maxLength={160} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Blue Area Office — Full Floor" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass} htmlFor="pf-type">Property type *</label>
            <select id="pf-type" className={inputClass} required value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
              <option value="">Select type…</option>
              {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
            <input id="pf-price" className={inputClass} type="number" min={0} inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="Leave empty for price on request" />
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

      <div className={cardClass}>
        <h2 className={headingClass}>Location &amp; size</h2>
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
        </div>
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
      </div>

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
        <h2 className={headingClass}>Photos</h2>
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
