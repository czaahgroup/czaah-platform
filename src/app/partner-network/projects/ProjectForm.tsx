'use client'

import { useEffect, useState } from 'react'
import { PORTAL_COUNTRIES } from '@/app/property-portal/_components/types'
import { PhotoUploader, FeatureChips, splitPaths } from '@/components/PhotoUploader'
import { PARTNER_MAX_PHOTOS } from '@/lib/uploadSafety'
import { CURRENCIES } from '@/lib/currencies'
import { PLOT_SIZE_UNITS, PLOT_CATEGORIES, POSSESSION_STATUSES, DEVELOPMENT_STATUSES, AVAILABILITY_STATUSES } from '@/lib/plots'
import { MAX_UNITS } from '@/lib/partnerDevelopments'
import type { CleanPlan } from '@/lib/listingEdits'
import { PaymentPlanEditor, EMPTY_PLAN, planDraftFrom, planPayload, type PlanDraft } from '../properties/PaymentPlanEditor'

const UNIT_KINDS = [
  { value: 'plot', label: 'Plot', land: true },
  { value: 'farm', label: 'Farm / agricultural land', land: true },
  { value: 'house', label: 'House / villa', land: false },
  { value: 'flat', label: 'Flat / apartment', land: false },
  { value: 'commercial_unit', label: 'Commercial unit', land: false },
]
const NEW_DEVELOPER = '__new__'

const inputClass = 'bg-surface-container border border-outline-variant/20 px-3 py-2.5 text-base sm:text-sm text-on-surface raleway-text w-full focus:border-primary outline-none transition-colors'
const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'
const cardClass = 'bg-surface-container border border-outline-variant/10 px-5 py-5 sm:px-6 sm:py-6 mb-5'
const headingClass = 'cinzel-text text-sm tracking-[0.15em] uppercase text-primary/80 mb-2'
const smallButton = 'text-xs raleway-text px-3 py-2 border border-outline-variant/20 text-on-surface-variant hover:text-on-surface'

export interface UnitDraft {
  title: string
  kind: string
  plotSize: string
  plotSizeUnit: string
  plotCategory: string
  bedrooms: string
  areaSqft: string
  totalPrice: string
  availabilityStatus: string
  plan: PlanDraft
}

export interface ProjectFormValues {
  name: string
  developer: string
  newDeveloperName: string
  newDeveloperWebsite: string
  newDeveloperDescription: string
  newDeveloperLogo: string
  country: string
  city: string
  area: string
  description: string
  currency: string
  developmentStatus: string
  possessionStatus: string
  features: string
  photos: string
  units: UnitDraft[]
}

const EMPTY_UNIT: UnitDraft = {
  title: '', kind: 'plot', plotSize: '', plotSizeUnit: 'marla', plotCategory: 'residential',
  bedrooms: '', areaSqft: '', totalPrice: '', availabilityStatus: 'available', plan: EMPTY_PLAN,
}

export const EMPTY_PROJECT: ProjectFormValues = {
  name: '', developer: '', newDeveloperName: '', newDeveloperWebsite: '', newDeveloperDescription: '', newDeveloperLogo: '',
  country: '', city: '', area: '', description: '', currency: 'PKR', developmentStatus: '', possessionStatus: '',
  features: '', photos: '', units: [EMPTY_UNIT],
}

const str = (v: unknown) => (v == null ? '' : String(v))

/** A development as the partner API returns it, as form values. */
export function formFromProject(row: Record<string, unknown>): ProjectFormValues {
  const units = Array.isArray(row.development_units) ? (row.development_units as Record<string, unknown>[]) : []
  return {
    ...EMPTY_PROJECT,
    name: str(row.name),
    developer: str(row.developer_name),
    country: str(row.country),
    city: str(row.city),
    area: str(row.area),
    description: str(row.description),
    currency: str(row.currency) || 'PKR',
    developmentStatus: str(row.development_status),
    possessionStatus: str(row.possession_status),
    features: Array.isArray(row.features) ? row.features.join(', ') : '',
    photos: Array.isArray(row.gallery) ? row.gallery.join(', ') : '',
    units: units.length
      ? units.map((u) => ({
          title: str(u.title),
          kind: str(u.property_subtype) || 'plot',
          plotSize: str(u.plot_size),
          plotSizeUnit: str(u.plot_size_unit) || 'marla',
          plotCategory: str(u.plot_category),
          bedrooms: str(u.bedrooms),
          areaSqft: str(u.area_sqft),
          totalPrice: str(u.total_price),
          availabilityStatus: str(u.availability_status) || 'available',
          plan: planDraftFrom(u.payment_plan as CleanPlan | null | undefined),
        }))
      : [EMPTY_UNIT],
  }
}

/** Form values as the body the partner developments API expects. */
export function payloadFromProject(form: ProjectFormValues) {
  const adding = form.developer === NEW_DEVELOPER
  return {
    name: form.name,
    developerName: adding ? '' : form.developer,
    newDeveloper: adding
      ? { name: form.newDeveloperName, website: form.newDeveloperWebsite, description: form.newDeveloperDescription, logo: splitPaths(form.newDeveloperLogo)[0] || '' }
      : null,
    country: form.country,
    city: form.city,
    area: form.area,
    description: form.description,
    currency: form.currency,
    developmentStatus: form.developmentStatus,
    possessionStatus: form.possessionStatus,
    features: form.features,
    photos: splitPaths(form.photos),
    // A unit card left completely empty is not a unit.
    units: form.units
      .filter((u) => u.title.trim() || u.totalPrice.trim() || u.plotSize.trim())
      .map((u) => {
        const land = !!UNIT_KINDS.find((k) => k.value === u.kind)?.land
        return {
          title: u.title,
          propertySubtype: u.kind,
          plotSize: land ? u.plotSize : '',
          plotSizeUnit: land ? u.plotSizeUnit : '',
          plotCategory: land ? u.plotCategory : '',
          bedrooms: land ? '' : u.bedrooms,
          areaSqft: land ? '' : u.areaSqft,
          totalPrice: u.totalPrice,
          availabilityStatus: u.availabilityStatus,
          paymentPlan: planPayload(u.plan, u.totalPrice, form.currency),
        }
      }),
  }
}

/**
 * The add / edit project form: the project, its developer, and one card per
 * plot size or home type, each with its own price and optional payment plan.
 */
export function ProjectForm({
  initial,
  submitLabel,
  busyLabel,
  onSubmit,
  onCancel,
}: {
  initial: ProjectFormValues
  submitLabel: string
  busyLabel: string
  /** Resolves to an error message, or nothing on success. */
  onSubmit: (values: ProjectFormValues) => Promise<string | void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [developers, setDevelopers] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadsInFlight, setUploadsInFlight] = useState(0)
  const onBusy = (busy: boolean) => setUploadsInFlight((n) => Math.max(0, n + (busy ? 1 : -1)))
  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => setForm((prev) => ({ ...prev, [key]: value }))
  const setUnit = (i: number, patch: Partial<UnitDraft>) => setForm((prev) => ({ ...prev, units: prev.units.map((u, j) => (j === i ? { ...u, ...patch } : u)) }))

  useEffect(() => {
    fetch('/api/partner/developers')
      .then((r) => r.json())
      .then((json) => setDevelopers([...(json.data || []), ...(json.mine || [])].map((d: { name: string }) => d.name)))
      .catch(() => {})
  }, [])

  const countries = form.country && !PORTAL_COUNTRIES.includes(form.country) ? [form.country, ...PORTAL_COUNTRIES] : PORTAL_COUNTRIES
  // The project's current developer stays selectable even if it is not in the list.
  const developerOptions = [...new Set([...(form.developer && form.developer !== NEW_DEVELOPER ? [form.developer] : []), ...developers])]

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
        <h2 className={`${headingClass} mb-5`}>The project</h2>
        <div className="mb-4">
          <label className={labelClass} htmlFor="pj-name">Project name *</label>
          <input id="pj-name" className={inputClass} required maxLength={150} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Citi Canal Enclave" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass} htmlFor="pj-country">Country *</label>
            <select id="pj-country" className={inputClass} required value={form.country} onChange={(e) => set('country', e.target.value)}>
              <option value="">Select a country…</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="pj-city">City *</label>
            <input id="pj-city" className={inputClass} required maxLength={80} value={form.city} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="pj-area">Area / location</label>
            <input id="pj-area" className={inputClass} maxLength={160} value={form.area} onChange={(e) => set('area', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="pj-ccy">Prices are in</label>
            <select id="pj-ccy" className={inputClass} value={form.currency} onChange={(e) => set('currency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="pj-status">Stage</label>
            <select id="pj-status" className={inputClass} value={form.developmentStatus} onChange={(e) => set('developmentStatus', e.target.value)}>
              <option value="">Not stated</option>
              {DEVELOPMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="pj-possession">Possession</label>
            <select id="pj-possession" className={inputClass} value={form.possessionStatus} onChange={(e) => set('possessionStatus', e.target.value)}>
              <option value="">Not stated</option>
              {POSSESSION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className={labelClass} htmlFor="pj-description">Description</label>
          <textarea id="pj-description" className={inputClass} rows={5} maxLength={6000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What the project is, where it is and what it offers." />
        </div>
        <div>
          <label className={labelClass} htmlFor="pj-features">Features</label>
          <input id="pj-features" className={inputClass} value={form.features} onChange={(e) => set('features', e.target.value)} placeholder="Tap below, or type your own separated by commas" />
          <FeatureChips value={form.features} onChange={(v) => set('features', v)} />
        </div>
      </div>

      <div className={cardClass}>
        <h2 className={`${headingClass} mb-5`}>Developer</h2>
        <label className={labelClass} htmlFor="pj-developer">Who is the developer?</label>
        <select id="pj-developer" className={inputClass} value={form.developer} onChange={(e) => set('developer', e.target.value)}>
          <option value="">Not stated</option>
          {developerOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          <option value={NEW_DEVELOPER}>+ Add a new developer…</option>
        </select>
        {form.developer === NEW_DEVELOPER && (
          <div className="mt-4 border-l-2 border-primary/30 pl-4">
            <p className="text-xs text-on-surface-variant/60 mb-3">A new developer is sent to CZAAH with this project and appears on the site once approved.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass} htmlFor="pj-dev-name">Developer name *</label>
                <input id="pj-dev-name" className={inputClass} required maxLength={150} value={form.newDeveloperName} onChange={(e) => set('newDeveloperName', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="pj-dev-site">Website</label>
                <input id="pj-dev-site" className={inputClass} maxLength={300} inputMode="url" value={form.newDeveloperWebsite} onChange={(e) => set('newDeveloperWebsite', e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="mb-4">
              <label className={labelClass} htmlFor="pj-dev-about">About the developer</label>
              <textarea id="pj-dev-about" className={inputClass} rows={3} maxLength={4000} value={form.newDeveloperDescription} onChange={(e) => set('newDeveloperDescription', e.target.value)} placeholder="Optional" />
            </div>
            <span className={labelClass}>Logo (optional)</span>
            <PhotoUploader value={form.newDeveloperLogo} title={form.newDeveloperName || 'developer-logo'} onChange={(v) => set('newDeveloperLogo', v)} onBusyChange={onBusy} endpoint="/api/partner/media/upload-url" maxPhotos={1} allowLinks={false} />
          </div>
        )}
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>Units &amp; prices</h2>
        <p className="text-sm text-on-surface-variant/70 mb-5">
          Add one card for each plot size or home type on sale — for example &ldquo;5 Marla plot&rdquo; and &ldquo;10 Marla plot&rdquo;. Each has its own price and payment plan.
        </p>
        {form.units.map((u, i) => {
          const land = !!UNIT_KINDS.find((k) => k.value === u.kind)?.land
          return (
            <fieldset key={i} className="border border-outline-variant/20 p-4 mb-4">
              <legend className="px-2 text-xs raleway-text uppercase tracking-[0.05em] text-on-surface-variant/60">Unit {i + 1}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass} htmlFor={`pj-u${i}-title`}>Name *</label>
                  <input id={`pj-u${i}-title`} className={inputClass} maxLength={120} value={u.title} onChange={(e) => setUnit(i, { title: e.target.value })} placeholder="e.g. 5 Marla plot" />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`pj-u${i}-kind`}>Type</label>
                  <select id={`pj-u${i}-kind`} className={inputClass} value={u.kind} onChange={(e) => setUnit(i, { kind: e.target.value })}>
                    {UNIT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
              </div>
              {land ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className={labelClass} htmlFor={`pj-u${i}-size`}>Plot size</label>
                    <input id={`pj-u${i}-size`} className={inputClass} type="number" min={0} step="any" inputMode="decimal" value={u.plotSize} onChange={(e) => setUnit(i, { plotSize: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`pj-u${i}-unit`}>Unit</label>
                    <select id={`pj-u${i}-unit`} className={inputClass} value={u.plotSizeUnit} onChange={(e) => setUnit(i, { plotSizeUnit: e.target.value })}>
                      {PLOT_SIZE_UNITS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`pj-u${i}-category`}>Category</label>
                    <select id={`pj-u${i}-category`} className={inputClass} value={u.plotCategory} onChange={(e) => setUnit(i, { plotCategory: e.target.value })}>
                      <option value="">Not stated</option>
                      {PLOT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelClass} htmlFor={`pj-u${i}-beds`}>Bedrooms</label>
                    <input id={`pj-u${i}-beds`} className={inputClass} type="number" min={0} inputMode="numeric" value={u.bedrooms} onChange={(e) => setUnit(i, { bedrooms: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`pj-u${i}-area`}>Area (sq ft)</label>
                    <input id={`pj-u${i}-area`} className={inputClass} type="number" min={0} inputMode="decimal" value={u.areaSqft} onChange={(e) => setUnit(i, { areaSqft: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass} htmlFor={`pj-u${i}-price`}>Price ({form.currency})</label>
                  <input id={`pj-u${i}-price`} className={inputClass} type="number" min={0} inputMode="decimal" value={u.totalPrice} onChange={(e) => setUnit(i, { totalPrice: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`pj-u${i}-availability`}>Availability</label>
                  <select id={`pj-u${i}-availability`} className={inputClass} value={u.availabilityStatus} onChange={(e) => setUnit(i, { availabilityStatus: e.target.value })}>
                    {AVAILABILITY_STATUSES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>
              <PaymentPlanEditor value={u.plan} onChange={(plan) => setUnit(i, { plan })} price={u.totalPrice} currency={form.currency} idPrefix={`pj-u${i}-plan`} />
              <div className="flex gap-2 flex-wrap mt-4">
                {form.units.length < MAX_UNITS && (
                  <button type="button" className={smallButton} onClick={() => setForm((prev) => ({ ...prev, units: [...prev.units.slice(0, i + 1), { ...u, title: '' }, ...prev.units.slice(i + 1)] }))}>
                    Copy this unit
                  </button>
                )}
                {form.units.length > 1 && (
                  <button type="button" className={`${smallButton} !text-red-400 !border-red-500/30`} onClick={() => setForm((prev) => ({ ...prev, units: prev.units.filter((_, j) => j !== i) }))}>
                    Remove
                  </button>
                )}
              </div>
            </fieldset>
          )
        })}
        {form.units.length < MAX_UNITS && (
          <button type="button" className="text-xs raleway-text px-4 py-2.5 border border-primary/40 text-primary" onClick={() => setForm((prev) => ({ ...prev, units: [...prev.units, EMPTY_UNIT] }))}>
            + Add another unit
          </button>
        )}
      </div>

      <div className={cardClass}>
        <h2 className={`${headingClass} mb-5`}>Photos</h2>
        <p className="text-xs text-on-surface-variant/60 mb-3">The first photo is the project&rsquo;s main image. Master plans and site maps are welcome.</p>
        <PhotoUploader value={form.photos} title={form.name} onChange={(v) => set('photos', v)} onBusyChange={onBusy} endpoint="/api/partner/media/upload-url" maxPhotos={PARTNER_MAX_PHOTOS} allowLinks={false} />
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
