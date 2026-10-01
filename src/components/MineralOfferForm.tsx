'use client'

import { useState } from 'react'
import { PhotoUploader, splitPaths } from '@/components/PhotoUploader'
import { CURRENCIES } from '@/lib/currencies'
import { OFFER_TYPES, MINERAL_CATEGORIES, QUANTITY_UNITS, INCOTERMS } from '@/lib/minerals'

const inputClass = 'bg-surface-container border border-outline-variant/20 px-3 py-2.5 text-base sm:text-sm text-on-surface raleway-text w-full focus:border-primary outline-none transition-colors'
const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'
const cardClass = 'bg-surface-container border border-outline-variant/10 px-5 py-5 sm:px-6 sm:py-6 mb-5'
const headingClass = 'cinzel-text text-sm tracking-[0.15em] uppercase text-primary/80 mb-5'

export interface MineralFormValues {
  offerType: string
  title: string
  commodity: string
  category: string
  form: string
  grade: string
  originCountry: string
  originRegion: string
  quantityAvailable: string
  quantityUnit: string
  minOrder: string
  supplyCapacity: string
  priceAmount: string
  priceCurrency: string
  incoterm: string
  loadingPort: string
  packaging: string
  description: string
  hasAssayReport: boolean
  hasExportLicence: boolean
  photos: string
}

export const EMPTY_MINERAL: MineralFormValues = {
  offerType: 'supply', title: '', commodity: '', category: '', form: '', grade: '',
  originCountry: 'Pakistan', originRegion: '', quantityAvailable: '', quantityUnit: 'MT', minOrder: '',
  supplyCapacity: '', priceAmount: '', priceCurrency: 'USD', incoterm: '', loadingPort: '', packaging: '',
  description: '', hasAssayReport: false, hasExportLicence: false, photos: '',
}

const str = (v: unknown) => (v == null ? '' : String(v))

/** An offer row (snake_case, as the API returns it) as form values. */
export function formFromOffer(row: Record<string, unknown>): MineralFormValues {
  return {
    offerType: str(row.offer_type) || 'supply',
    title: str(row.title),
    commodity: str(row.commodity),
    category: str(row.category),
    form: str(row.form),
    grade: str(row.grade),
    originCountry: str(row.origin_country),
    originRegion: str(row.origin_region),
    quantityAvailable: str(row.quantity_available),
    quantityUnit: str(row.quantity_unit) || 'MT',
    minOrder: str(row.min_order),
    supplyCapacity: str(row.supply_capacity),
    priceAmount: str(row.price_amount),
    priceCurrency: str(row.price_currency) || 'USD',
    incoterm: str(row.incoterm),
    loadingPort: str(row.loading_port),
    packaging: str(row.packaging),
    description: str(row.description),
    hasAssayReport: row.has_assay_report === true,
    hasExportLicence: row.has_export_licence === true,
    photos: Array.isArray(row.images) ? row.images.join(', ') : '',
  }
}

/** Form values as the body the minerals APIs expect. */
export function payloadFromMineral(form: MineralFormValues) {
  const { photos, ...fields } = form
  return { ...fields, images: splitPaths(photos) }
}

/**
 * The add / edit mineral offer form, used by partners (Partner Network) and
 * admins (Admin → Minerals). The caller decides what saving means and where
 * photos upload to.
 */
export function MineralOfferForm({
  initial,
  submitLabel,
  busyLabel,
  onSubmit,
  onCancel,
  uploadEndpoint,
  maxPhotos = 20,
}: {
  initial: MineralFormValues
  submitLabel: string
  busyLabel: string
  /** Resolves to an error message, or nothing on success. */
  onSubmit: (values: MineralFormValues) => Promise<string | void>
  onCancel: () => void
  /** Partners upload through their own signed-URL route; admins use the default. */
  uploadEndpoint?: string
  maxPhotos?: number
}) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadsInFlight, setUploadsInFlight] = useState(0)
  const set = <K extends keyof MineralFormValues>(key: K, value: MineralFormValues[K]) => setForm((prev) => ({ ...prev, [key]: value }))
  const supply = form.offerType === 'supply'
  const type = OFFER_TYPES.find((t) => t.value === form.offerType)

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
        <h2 className={headingClass}>What are you offering?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass} htmlFor="mo-type">Kind of offer *</label>
            <select id="mo-type" className={inputClass} value={form.offerType} onChange={(e) => set('offerType', e.target.value)}>
              {OFFER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {type && <p className="text-xs text-on-surface-variant/60 mt-1.5">{type.hint}</p>}
          </div>
          <div>
            <label className={labelClass} htmlFor="mo-category">Category *</label>
            <select id="mo-category" className={inputClass} required value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Select…</option>
              {MINERAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="mo-commodity">Mineral *</label>
            <input id="mo-commodity" className={inputClass} required maxLength={80} value={form.commodity} onChange={(e) => set('commodity', e.target.value)} placeholder="e.g. Chromite" />
          </div>
          <div>
            <label className={labelClass} htmlFor="mo-form">Form</label>
            <input id="mo-form" className={inputClass} maxLength={80} value={form.form} onChange={(e) => set('form', e.target.value)} placeholder="e.g. Lump ore, concentrate, blocks" />
          </div>
        </div>
        <div className="mb-4">
          <label className={labelClass} htmlFor="mo-title">Title *</label>
          <input id="mo-title" className={inputClass} required maxLength={160} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={supply ? 'e.g. Chromite lump ore, Cr2O3 42–46%' : 'e.g. Copper exploration licence, Chagai'} />
        </div>
        <div>
          <label className={labelClass} htmlFor="mo-grade">Grade / specification</label>
          <input id="mo-grade" className={inputClass} maxLength={160} value={form.grade} onChange={(e) => set('grade', e.target.value)} placeholder="e.g. Cr2O3 42–46%, SiO2 max 8%" />
          <p className="text-xs text-on-surface-variant/60 mt-1.5">State only what an assay or certificate supports. CZAAH may ask to see it before approving.</p>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>Origin</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="mo-country">Country *</label>
            <input id="mo-country" className={inputClass} required maxLength={80} value={form.originCountry} onChange={(e) => set('originCountry', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="mo-region">Province / region</label>
            <input id="mo-region" className={inputClass} maxLength={80} value={form.originRegion} onChange={(e) => set('originRegion', e.target.value)} placeholder="e.g. Balochistan" />
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>{supply ? 'Quantity & price' : 'Size & value'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={labelClass} htmlFor="mo-qty">{supply ? 'Quantity available' : 'Estimated quantity'}</label>
            <input id="mo-qty" className={inputClass} type="number" min={0} step="any" inputMode="decimal" value={form.quantityAvailable} onChange={(e) => set('quantityAvailable', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="mo-unit">Unit</label>
            <select id="mo-unit" className={inputClass} value={form.quantityUnit} onChange={(e) => set('quantityUnit', e.target.value)}>
              {QUANTITY_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          {supply && (
            <div>
              <label className={labelClass} htmlFor="mo-min">Minimum order</label>
              <input id="mo-min" className={inputClass} type="number" min={0} step="any" inputMode="decimal" value={form.minOrder} onChange={(e) => set('minOrder', e.target.value)} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="mo-price">{supply ? 'Price per unit' : 'Asking value'}</label>
            <input id="mo-price" className={inputClass} type="number" min={0} step="any" inputMode="decimal" value={form.priceAmount} onChange={(e) => set('priceAmount', e.target.value)} placeholder="Leave empty for price on request" />
          </div>
          <div>
            <label className={labelClass} htmlFor="mo-ccy">Currency</label>
            <select id="mo-ccy" className={inputClass} value={form.priceCurrency} onChange={(e) => set('priceCurrency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {supply && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClass} htmlFor="mo-incoterm">Delivery terms (Incoterm)</label>
              <select id="mo-incoterm" className={inputClass} value={form.incoterm} onChange={(e) => set('incoterm', e.target.value)}>
                <option value="">Not stated</option>
                {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="mo-port">Loading port</label>
              <input id="mo-port" className={inputClass} maxLength={80} value={form.loadingPort} onChange={(e) => set('loadingPort', e.target.value)} placeholder="e.g. Karachi" />
            </div>
            <div>
              <label className={labelClass} htmlFor="mo-capacity">Supply capacity</label>
              <input id="mo-capacity" className={inputClass} maxLength={120} value={form.supplyCapacity} onChange={(e) => set('supplyCapacity', e.target.value)} placeholder="e.g. 2,000 MT per month" />
            </div>
            <div>
              <label className={labelClass} htmlFor="mo-packaging">Packaging</label>
              <input id="mo-packaging" className={inputClass} maxLength={120} value={form.packaging} onChange={(e) => set('packaging', e.target.value)} placeholder="e.g. Bulk, 1 MT jumbo bags" />
            </div>
          </div>
        )}
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>Details &amp; documents</h2>
        <div className="mb-4">
          <label className={labelClass} htmlFor="mo-description">Description</label>
          <textarea id="mo-description" className={inputClass} rows={5} maxLength={6000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Where it is from, how it is produced, and anything a buyer should know." />
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
            <input type="checkbox" checked={form.hasAssayReport} onChange={(e) => set('hasAssayReport', e.target.checked)} />
            I hold an assay / test report and can provide it
          </label>
          <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
            <input type="checkbox" checked={form.hasExportLicence} onChange={(e) => set('hasExportLicence', e.target.checked)} />
            I hold the mining lease or export licence and can provide it
          </label>
        </div>
        <p className="text-xs text-on-surface-variant/60 mt-3">These are shown to buyers as the seller&rsquo;s statement. An offer is only marked Verified after CZAAH has seen the documents.</p>
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>Photos</h2>
        <PhotoUploader
          value={form.photos}
          title={form.title}
          onChange={(v) => set('photos', v)}
          onBusyChange={(busy) => setUploadsInFlight((n) => Math.max(0, n + (busy ? 1 : -1)))}
          {...(uploadEndpoint ? { endpoint: uploadEndpoint, allowLinks: false } : {})}
          maxPhotos={maxPhotos}
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
