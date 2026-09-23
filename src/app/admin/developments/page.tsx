'use client'
// @ts-nocheck
// Matches the convention in admin/properties/page.tsx — a single self-contained
// client page for a form-heavy admin screen.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PLOT_SIZE_UNITS,
  PLOT_CATEGORIES,
  POSSESSION_STATUSES,
  DEVELOPMENT_STATUSES,
  AVAILABILITY_STATUSES,
  PROPERTY_SUBTYPES,
  formatPlotSize,
} from '@/lib/plots'
import { CURRENCIES } from '@/lib/currencies'
import { reconcilePaymentPlan, formatMoney } from '@/lib/paymentPlan'

// Rows come back from an untyped Supabase client and the forms are loose by
// nature; this alias keeps the annotations honest without reaching for any.
type Row = Record<string, unknown>

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-container-lowest, #0a0a0a)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 0,
  padding: '9px 12px',
  fontSize: '13px',
  color: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  opacity: 0.6,
  marginBottom: '5px',
}

const hintStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontSize: '11.5px',
  lineHeight: 1.5,
  color: 'rgba(228,224,218,0.5)',
}

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'var(--surface-container-low, #111)',
  padding: '16px',
  marginBottom: '12px',
}

const buttonStyle: React.CSSProperties = {
  background: '#C9A84C',
  color: '#000',
  border: 'none',
  padding: '10px 22px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const removeBadge: React.CSSProperties = {
  position: 'absolute',
  top: '-8px',
  right: '-8px',
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.3)',
  background: '#1a1a1a',
  color: '#ef4444',
  fontSize: '15px',
  lineHeight: 1,
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
}

const ghostButton: React.CSSProperties = {
  background: 'transparent',
  color: 'inherit',
  border: '1px solid rgba(255,255,255,0.18)',
  padding: '7px 14px',
  fontSize: '12px',
  cursor: 'pointer',
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  published: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  archived: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
  available: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  reserved: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  sold: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
  unavailable: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
}

function Chip({ value }: { value: string }) {
  const s = statusStyles[value] || statusStyles.archived
  return (
    <span style={{ background: s.bg, color: s.text, padding: '3px 9px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {value}
    </span>
  )
}

const emptyUnit = () => ({
  id: null,
  title: '',
  propertySubtype: 'plot',
  plotSize: '',
  plotSizeUnit: 'marla',
  plotCategory: 'residential',
  totalPrice: '',
  currency: 'PKR',
  availabilityStatus: 'available',
  possessionStatus: '',
  block: '',
  sector: '',
  plotNumber: '',
  cornerPlot: false,
  parkFacing: false,
  mainRoad: false,
  boulevard: false,
  canalFacing: false,
  description: '',
  plan: { name: 'Payment plan', totalPrice: '', downPayment: '', durationMonths: '', installments: [] },
})

const emptyInstallment = (n: number) => ({
  installment_number: n,
  label: `Instalment ${n}`,
  amount: '',
  additional_amount: '',
  due_after_months: '',
})

const emptyForm = {
  name: '',
  developerName: '',
  marketingAgent: '',
  description: '',
  country: 'Pakistan',
  provinceState: '',
  city: '',
  area: '',
  address: '',
  latitude: '',
  longitude: '',
  currency: 'PKR',
  approvalStatus: '',
  approvalAuthority: '',
  developmentStatus: 'launched',
  possessionStatus: '',
  features: '',
  status: 'draft',
  featured: false,
  verified: false,
  featuredImage: '',
  gallery: [] as string[],
  videoUrl: '',
  videoPosterUrl: '',
  brochureUrl: '',
  brochureName: '',
}

// No size limit is enforced in the form. Storage decides, and if it refuses
// the upload the message below says so with the file's real size — rather than
// this file carrying a number that has to be kept in step with a setting it
// cannot see.

/** A preview URL for either a freshly picked file or an already stored path. */
function mediaPreview(value: string): string {
  if (!value) return ''
  if (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/')) return value
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${value}`
}

/**
 * Uploads a file straight into storage and returns its path.
 *
 * Files used to be base64'd into the JSON save, which inflates them by a third
 * and has to be buffered whole in the Worker — a phone video never stood a
 * chance. A signed URL puts the browser in touch with storage directly, so the
 * save request only ever carries the resulting path.
 */
async function uploadToStorage(file: File, folder: string): Promise<string> {
  const res = await fetch('/api/admin/media/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || `Could not start the upload (${res.status})`)

  const put = await fetch(json.signedUrl, {
    method: 'PUT',
    headers: {
      // The server resolves the type (some pickers report none), and the
      // bucket checks the header against its allow-list, so use its answer.
      'Content-Type': json.contentType || file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file,
  })
  if (!put.ok) {
    const detail = await put.text().catch(() => '')
    const sizeMb = (file.size / 1048576).toFixed(0)
    // Storage rejects anything over the project's upload file size limit, which
    // no part of the app can read — so name the setting rather than a number.
    if (put.status === 413 || detail.includes('EntityTooLarge')) {
      throw new Error(
        `${file.name} is ${sizeMb}MB and storage refused it. Raise "Upload file size limit" ` +
          'in the Supabase dashboard under Storage → Settings, or compress the file.'
      )
    }
    throw new Error(`Upload of ${file.name} (${sizeMb}MB) failed (${put.status}). ${detail.slice(0, 140)}`)
  }

  return json.path as string
}

/** Live reconciliation banner — warns, never edits the numbers. */
function PlanReconciliation({ plan, currency }: { plan: Row; currency: string }) {
  const result = useMemo(
    () =>
      reconcilePaymentPlan({
        total_price: plan.totalPrice,
        down_payment: plan.downPayment,
        currency,
        installments: plan.installments,
      }),
    [plan, currency]
  )

  if (!plan.installments?.length && !plan.downPayment) return null

  const ok = result.reconciles
  return (
    <div
      style={{
        border: `1px solid ${ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.5)'}`,
        background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.1)',
        padding: '10px 12px',
        fontSize: '12px',
        lineHeight: 1.6,
        marginTop: '10px',
      }}
    >
      <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', opacity: 0.85 }}>
        <span>Down payment: <strong>{formatMoney(result.downPayment, currency)}</strong></span>
        <span>Instalments: <strong>{formatMoney(result.installmentTotal, currency)}</strong></span>
        <span>Additional: <strong>{formatMoney(result.additionalTotal, currency)}</strong></span>
        <span>Schedule total: <strong>{formatMoney(result.scheduledTotal, currency)}</strong></span>
      </div>
      {ok ? (
        result.advertisedTotal != null && (
          <div style={{ marginTop: '6px', color: '#22c55e' }}>
            Reconciles with the advertised price of {formatMoney(result.advertisedTotal, currency)}.
          </div>
        )
      ) : (
        <div style={{ marginTop: '6px', color: '#ef4444' }}>
          <strong>Payment plan does not equal advertised total price.</strong> {result.warning?.replace('Payment plan does not equal advertised total price. ', '')}
          <div style={{ marginTop: '4px', opacity: 0.8 }}>
            Nothing has been changed for you — check the advert and correct whichever figure is wrong.
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentPlanEditor({ plan, currency, onChange }: { plan: Row; currency: string; onChange: (p: Row) => void }) {
  const set = (key: string, value: unknown) => onChange({ ...plan, [key]: value })

  const setRow = (i: number, key: string, value: unknown) => {
    const rows = [...plan.installments]
    rows[i] = { ...rows[i], [key]: value }
    onChange({ ...plan, installments: rows })
  }

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '14px', paddingTop: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment plan</strong>
        <button
          type="button"
          style={ghostButton}
          onClick={() => onChange({ ...plan, installments: [...plan.installments, emptyInstallment(plan.installments.length + 1)] })}
        >
          + Instalment
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Advertised total</label>
          <input type="text" inputMode="numeric" value={plan.totalPrice} onChange={(e) => set('totalPrice', e.target.value)} placeholder="6950000" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Down payment</label>
          <input type="text" inputMode="numeric" value={plan.downPayment} onChange={(e) => set('downPayment', e.target.value)} placeholder="1400000" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Duration (months)</label>
          <input type="number" value={plan.durationMonths} onChange={(e) => set('durationMonths', e.target.value)} placeholder="24" style={inputStyle} />
        </div>
      </div>

      {plan.installments.length > 0 && (
        <table style={{ width: '100%', marginTop: '12px', fontSize: '12px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ opacity: 0.6, textAlign: 'left' }}>
              <th style={{ padding: '4px 6px', width: '22%' }}>Label</th>
              <th style={{ padding: '4px 6px' }}>Amount</th>
              <th style={{ padding: '4px 6px' }}>Additional</th>
              <th style={{ padding: '4px 6px' }}>Due after (months)</th>
              <th style={{ padding: '4px 6px', width: '40px' }} />
            </tr>
          </thead>
          <tbody>
            {plan.installments.map((row: Row, i: number) => (
              <tr key={i}>
                <td style={{ padding: '3px 6px' }}>
                  <input value={row.label} onChange={(e) => setRow(i, 'label', e.target.value)} style={{ ...inputStyle, padding: '6px 8px' }} />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <input inputMode="numeric" value={row.amount} onChange={(e) => setRow(i, 'amount', e.target.value)} style={{ ...inputStyle, padding: '6px 8px' }} />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <input inputMode="numeric" value={row.additional_amount} onChange={(e) => setRow(i, 'additional_amount', e.target.value)} style={{ ...inputStyle, padding: '6px 8px' }} />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <input type="number" value={row.due_after_months} onChange={(e) => setRow(i, 'due_after_months', e.target.value)} style={{ ...inputStyle, padding: '6px 8px' }} />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <button
                    type="button"
                    onClick={() => onChange({ ...plan, installments: plan.installments.filter((_: Row, j: number) => j !== i) })}
                    style={{ ...ghostButton, padding: '6px 9px' }}
                    aria-label={`Remove instalment ${i + 1}`}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={hintStyle}>
        &ldquo;Additional&rdquo; is for the lump sums adverts show alongside an instalment (for example &ldquo;additional after 1 year&rdquo;).
        It is kept as its own line so the advert&rsquo;s shape survives.
      </p>

      <PlanReconciliation plan={plan} currency={currency} />
    </div>
  )
}

function UnitEditor({ unit, currency, onChange, onRemove }: { unit: Row; currency: string; onChange: (u: Row) => void; onRemove: () => void }) {
  const set = (key: string, value: unknown) => onChange({ ...unit, [key]: value })
  const subtype = PROPERTY_SUBTYPES.find((s) => s.value === unit.propertySubtype)
  const isLand = subtype?.isLand ?? true

  return (
    <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong style={{ fontSize: '13px' }}>{unit.title || 'New plot variant'}</strong>
        <button type="button" style={ghostButton} onClick={onRemove}>Remove</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Title *</label>
          <input value={unit.title} onChange={(e) => set('title', e.target.value)} placeholder="5 Marla" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={unit.propertySubtype} onChange={(e) => set('propertySubtype', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {PROPERTY_SUBTYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Availability</label>
          <select value={unit.availabilityStatus} onChange={(e) => set('availabilityStatus', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {AVAILABILITY_STATUSES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {isLand && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
          <div>
            <label style={labelStyle}>Plot size *</label>
            <input type="number" step="0.01" value={unit.plotSize} onChange={(e) => set('plotSize', e.target.value)} placeholder="5" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Unit *</label>
            <select value={unit.plotSizeUnit} onChange={(e) => set('plotSizeUnit', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {PLOT_SIZE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category *</label>
            <select value={unit.plotCategory} onChange={(e) => set('plotCategory', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {PLOT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
        <div>
          <label style={labelStyle}>Total price</label>
          <input type="text" inputMode="numeric" value={unit.totalPrice} onChange={(e) => set('totalPrice', e.target.value)} placeholder="6950000" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Possession</label>
          <select value={unit.possessionStatus} onChange={(e) => set('possessionStatus', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">—</option>
            {POSSESSION_STATUSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Block / Sector / Plot no.</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input value={unit.block} onChange={(e) => set('block', e.target.value)} placeholder="Block" style={inputStyle} />
            <input value={unit.sector} onChange={(e) => set('sector', e.target.value)} placeholder="Sector" style={inputStyle} />
            <input value={unit.plotNumber} onChange={(e) => set('plotNumber', e.target.value)} placeholder="No." style={inputStyle} />
          </div>
        </div>
      </div>

      {isLand && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '12px', fontSize: '12px' }}>
          {[
            ['cornerPlot', 'Corner'],
            ['parkFacing', 'Park facing'],
            ['mainRoad', 'Main road'],
            ['boulevard', 'Boulevard'],
            ['canalFacing', 'Canal facing'],
          ].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!unit[key]} onChange={(e) => set(key, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      )}

      <PaymentPlanEditor plan={unit.plan} currency={unit.currency || currency} onChange={(p) => set('plan', p)} />
    </div>
  )
}

export default function AdminDevelopmentsPage() {
  const [developments, setDevelopments] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [units, setUnits] = useState<Row[]>([emptyUnit()])
  const [expanded, setExpanded] = useState<string | null>(null)
  // Edit mode reuses the create form rather than duplicating it. editingId
  // null means the form is creating; a uuid means it is editing that row.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)
  // Variants deleted in the form are only removed from the database on save,
  // so cancelling an edit cannot destroy a plot size.
  const [removedUnitIds, setRemovedUnitIds] = useState<string[]>([])
  // Which media field is mid-upload, so the form can show it and block save.
  const [uploading, setUploading] = useState<string | null>(null)
  // Which media the editor explicitly removed. An empty media field is only
  // written back as "cleared" if it is in here — otherwise a form that failed
  // to load a value (a stale bundle, a slow fetch) would silently wipe it.
  const [clearedMedia, setClearedMedia] = useState<string[]>([])
  // True once a record's media has actually been read into the form.
  const [mediaLoaded, setMediaLoaded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/developments')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      setDevelopments(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load developments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const update = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }))

  async function pickMedia(
    key: 'featuredImage' | 'gallery' | 'videoUrl' | 'videoPosterUrl' | 'brochureUrl',
    files: FileList | null
  ) {
    if (!files?.length) return
    const picked = Array.from(files).slice(0, 12)

    setError(null)
    setUploading(key)
    try {
      // Files land in storage now, not on save, so a failure is reported here
      // rather than silently dropping the file out of the record later.
      const folder = form.name ? form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'new'
      const paths: string[] = []
      for (const file of picked) paths.push(await uploadToStorage(file, folder))

      setClearedMedia((c) => c.filter((k) => k !== key))
      if (key === 'gallery') {
        update('gallery', [...form.gallery, ...paths])
      } else {
        update(key, paths[0])
        // Keep the original filename so the download is not called "1790095371583_0.pdf".
        if (key === 'brochureUrl') update('brochureName', picked[0].name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(null)
    }
  }

  /** Drop one gallery entry. The file itself is removed on save. */
  function removeGalleryAt(index: number) {
    update('gallery', form.gallery.filter((_: string, i: number) => i !== index))
  }

  /** Clear a single-file media field, and record that it was deliberate. */
  function clearMedia(key: 'featuredImage' | 'videoUrl' | 'videoPosterUrl' | 'brochureUrl') {
    update(key, '')
    if (key === 'brochureUrl') update('brochureName', '')
    setClearedMedia((c) => (c.includes(key) ? c : [...c, key]))
  }

  function unitPayload(u: Row) {
    const hasPlan = u.plan && (u.plan.installments?.length || u.plan.downPayment || u.plan.totalPrice)
    return {
      title: u.title,
      propertySubtype: u.propertySubtype,
      propertyType: PROPERTY_SUBTYPES.find((s) => s.value === u.propertySubtype)?.assetClass || 'land',
      plotSize: u.plotSize || null,
      plotSizeUnit: u.plotSizeUnit || null,
      plotCategory: u.plotCategory || null,
      totalPrice: u.totalPrice || null,
      currency: u.currency || form.currency,
      availabilityStatus: u.availabilityStatus,
      possessionStatus: u.possessionStatus || null,
      block: u.block || null,
      sector: u.sector || null,
      plotNumber: u.plotNumber || null,
      cornerPlot: u.cornerPlot,
      parkFacing: u.parkFacing,
      mainRoad: u.mainRoad,
      boulevard: u.boulevard,
      canalFacing: u.canalFacing,
      description: u.description || null,
      paymentPlan: hasPlan
        ? {
            name: u.plan.name || 'Payment plan',
            total_price: u.plan.totalPrice || null,
            down_payment: u.plan.downPayment || null,
            currency: u.currency || form.currency,
            duration_months: u.plan.durationMonths ? Number(u.plan.durationMonths) : null,
            installments: (u.plan.installments || []).map((r: Row, i: number) => ({
              installment_number: i + 1,
              label: r.label || null,
              amount: r.amount || 0,
              additional_amount: r.additional_amount || 0,
              due_after_months: r.due_after_months === '' ? null : Number(r.due_after_months),
              display_order: i + 1,
            })),
          }
        : null,
    }
  }

  function resetForm() {
    setForm({ ...emptyForm })
    setUnits([emptyUnit()])
    setClearedMedia([])
    setMediaLoaded(false)
    setRemovedUnitIds([])
    setEditingId(null)
    setCreating(false)
  }

  /** Pull the full record — units and their payment plans — into the form. */
  async function openEdit(dev: Row) {
    setError(null)
    setNotice(null)
    setWarnings([])
    setLoadingEdit(true)
    setCreating(false)
    setEditingId(dev.id)
    setRemovedUnitIds([])
    setClearedMedia([])
    setMediaLoaded(false)
    try {
      const res = await fetch(`/api/admin/developments/${dev.id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      const d = json.data
      const plans = d.payment_plans || {}

      setForm({
        name: d.name || '',
        developerName: d.developer_name || '',
        marketingAgent: d.marketing_agent || '',
        description: d.description || '',
        country: d.country || '',
        provinceState: d.province_state || '',
        city: d.city || '',
        area: d.area || '',
        address: d.address || '',
        latitude: d.latitude != null ? String(d.latitude) : '',
        longitude: d.longitude != null ? String(d.longitude) : '',
        currency: d.currency || 'PKR',
        approvalStatus: d.approval_status || '',
        approvalAuthority: d.approval_authority || '',
        developmentStatus: d.development_status || '',
        possessionStatus: d.possession_status || '',
        features: (d.features || []).join(', '),
        status: d.status || 'draft',
        featured: !!d.featured,
        verified: !!d.verified,
        // Images already live in storage; they are only re-sent if replaced.
        featuredImage: d.featured_image || '',
        gallery: d.gallery || [],
        videoUrl: d.video_url || '',
        videoPosterUrl: d.video_poster_url || '',
        brochureUrl: d.brochure_url || '',
        brochureName: d.brochure_name || '',
      })

      const loaded = [...(d.development_units || [])]
        .sort((a: Row, b: Row) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((u: Row) => {
          const entry = plans[u.id]
          const plan = entry?.plan
          return {
            id: u.id,
            title: u.title || '',
            propertySubtype: u.property_subtype || 'plot',
            plotSize: u.plot_size != null ? String(u.plot_size) : '',
            plotSizeUnit: u.plot_size_unit || 'marla',
            plotCategory: u.plot_category || 'residential',
            totalPrice: u.total_price != null ? String(u.total_price) : '',
            currency: u.currency || d.currency || 'PKR',
            availabilityStatus: u.availability_status || 'available',
            possessionStatus: u.possession_status || '',
            block: u.block || '',
            sector: u.sector || '',
            plotNumber: u.plot_number || '',
            cornerPlot: !!u.corner_plot,
            parkFacing: !!u.park_facing,
            mainRoad: !!u.main_road,
            boulevard: !!u.boulevard,
            canalFacing: !!u.canal_facing,
            description: u.description || '',
            plan: {
              name: plan?.name || 'Payment plan',
              totalPrice: plan?.total_price != null ? String(plan.total_price) : '',
              downPayment: plan?.down_payment != null ? String(plan.down_payment) : '',
              durationMonths: plan?.duration_months != null ? String(plan.duration_months) : '',
              installments: (entry?.installments || []).map((r: Row) => ({
                installment_number: r.installment_number,
                label: r.label || '',
                amount: r.amount != null ? String(r.amount) : '',
                additional_amount: r.additional_amount != null ? String(r.additional_amount) : '',
                due_after_months: r.due_after_months != null ? String(r.due_after_months) : '',
              })),
            },
          }
        })

      setUnits(loaded.length ? loaded : [emptyUnit()])
      setMediaLoaded(true)
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setEditingId(null)
      setError(err instanceof Error ? err.message : 'Could not load that development.')
    } finally {
      setLoadingEdit(false)
    }
  }

  /**
   * The save payload, with media handled so an edit can only ever set a value
   * or clear one the editor actually removed.
   *
   * Sending every media field unconditionally cost a live brochure: the form
   * had not loaded it, so an empty string went up and the server dutifully
   * wrote null. A field that is empty and was NOT explicitly cleared is now
   * omitted, and the server leaves the stored value alone.
   */
  function mediaSafeBody() {
    const body: Row = { ...form }
    for (const key of ['featuredImage', 'videoUrl', 'videoPosterUrl', 'brochureUrl']) {
      if (form[key]) continue
      if (clearedMedia.includes(key)) body[key] = ''
      else delete body[key]
    }
    if (!form.brochureUrl && !clearedMedia.includes('brochureUrl')) delete body.brochureName
    // Same for the gallery: only write it when this form actually read one.
    if (!mediaLoaded && !creating) delete body.gallery
    return body
  }

  /** Save an edit: the development, then add / update / remove its variants. */
  async function saveEdit() {
    const collected: string[] = []

    const res = await fetch(`/api/admin/developments/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mediaSafeBody()),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)

    for (const id of removedUnitIds) {
      await fetch(`/api/admin/development-units/${id}`, { method: 'DELETE' })
    }

    for (const [i, u] of units.filter((x) => x.title).entries()) {
      const payload = { ...unitPayload(u), displayOrder: i + 1 }
      const unitRes = u.id
        ? await fetch(`/api/admin/development-units/${u.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/developments/${editingId}/units`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const unitJson = await unitRes.json()
      if (!unitRes.ok) throw new Error(`${u.title}: ${unitJson?.error || 'could not be saved'}`)
      if (unitJson.warning) collected.push(`${u.title}: ${unitJson.warning}`)
    }

    return { name: json.data.name, warnings: collected }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    setWarnings([])
    try {
      if (editingId) {
        const { name, warnings: unitWarnings } = await saveEdit()
        setNotice(`Saved "${name}".`)
        if (unitWarnings.length) setWarnings(unitWarnings)
        resetForm()
        load()
        return
      }

      const res = await fetch('/api/admin/developments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          units: units.filter((u) => u.title).map(unitPayload),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      setNotice(`Created "${json.data.name}".`)
      if (json.warnings?.length) setWarnings(json.warnings)
      resetForm()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${editingId ? 'save' : 'create'} the development.`)
    } finally {
      setSaving(false)
    }
  }

  async function patchDevelopment(id: string, body: Record<string, unknown>, message: string) {
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/admin/developments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      setNotice(message)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  async function removeDevelopment(dev: Row) {
    if (!window.confirm(`Delete "${dev.name}" and its ${dev.development_units?.length || 0} plot variant(s)? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/developments/${dev.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      setNotice(`Deleted "${dev.name}".`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  async function duplicateDevelopment(dev: Row) {
    const copy = {
      name: `${dev.name} (copy)`,
      slug: `${dev.slug}-copy`,
      developerName: dev.developer_name,
      marketingAgent: dev.marketing_agent,
      description: dev.description,
      country: dev.country,
      provinceState: dev.province_state,
      city: dev.city,
      area: dev.area,
      address: dev.address,
      latitude: dev.latitude,
      longitude: dev.longitude,
      currency: dev.currency,
      approvalStatus: dev.approval_status,
      approvalAuthority: dev.approval_authority,
      developmentStatus: dev.development_status,
      possessionStatus: dev.possession_status,
      features: dev.features,
      // A copy always starts as a draft — duplicating should never publish.
      status: 'draft',
      // Image paths are reused rather than re-uploaded.
      featuredImage: dev.featured_image,
      gallery: dev.gallery,
      units: (dev.development_units || []).map((u: Row) => ({
        title: u.title,
        propertyType: u.property_type,
        propertySubtype: u.property_subtype,
        plotSize: u.plot_size,
        plotSizeUnit: u.plot_size_unit,
        plotCategory: u.plot_category,
        totalPrice: u.total_price,
        currency: u.currency,
        availabilityStatus: u.availability_status,
        possessionStatus: u.possession_status,
        block: u.block,
        sector: u.sector,
        plotNumber: u.plot_number,
        cornerPlot: u.corner_plot,
        parkFacing: u.park_facing,
        mainRoad: u.main_road,
        boulevard: u.boulevard,
        canalFacing: u.canal_facing,
      })),
    }
    try {
      const res = await fetch('/api/admin/developments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copy),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      setNotice(`Duplicated as "${json.data.name}" (draft). Payment plans are not copied — add them on the new record.`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplicate failed.')
    }
  }

  async function setUnitAvailability(unitId: string, availabilityStatus: string) {
    try {
      const res = await fetch(`/api/admin/development-units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilityStatus }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Update failed')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1180px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '22px', margin: 0 }}>Developments</h1>
          <p style={{ ...hintStyle, marginTop: '6px', maxWidth: '620px' }}>
            A scheme with several plot sizes is one development plus a variant per size — never a duplicated
            development record. Each variant can carry its own payment plan.
          </p>
        </div>
        <button
          style={buttonStyle}
          onClick={() => {
            if (creating || editingId) resetForm()
            else setCreating(true)
          }}
        >
          {creating || editingId ? 'Cancel' : '+ New development'}
        </button>
      </div>

      {error && <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }}>{error}</div>}
      {notice && <div style={{ ...cardStyle, borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e' }}>{notice}</div>}
      {warnings.length > 0 && (
        <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.5)' }}>
          <strong style={{ color: '#ef4444' }}>Payment plan warnings</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '12.5px', lineHeight: 1.6 }}>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
          <p style={hintStyle}>Saved exactly as entered — no figure was changed.</p>
        </div>
      )}

      {loadingEdit && <div style={cardStyle}>Loading development…</div>}

      {(creating || (editingId && !loadingEdit)) && (
        <form onSubmit={submit} style={{ ...cardStyle, padding: '20px', marginBottom: '26px' }}>
          <h2 style={{ fontSize: '15px', margin: '0 0 16px' }}>
            {editingId ? `Editing ${form.name || 'development'}` : 'New development'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Citi Canal Enclave" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Developer</label>
              <input value={form.developerName} onChange={(e) => update('developerName', e.target.value)} placeholder="Citi Housing" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Marketing / agent brand</label>
              <input value={form.marketingAgent} onChange={(e) => update('marketingAgent', e.target.value)} placeholder="Agency or brand marketing it" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={labelStyle}>Country *</label>
              <input required value={form.country} onChange={(e) => update('country', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Province / state</label>
              <input value={form.provinceState} onChange={(e) => update('provinceState', e.target.value)} placeholder="Punjab" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>City *</label>
              <input required value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Gujranwala" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Area</label>
              <input value={form.area} onChange={(e) => update('area', e.target.value)} placeholder="Canal Road" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={form.currency} onChange={(e) => update('currency', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Development status</label>
              <select value={form.developmentStatus} onChange={(e) => update('developmentStatus', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">—</option>
                {DEVELOPMENT_STATUSES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Latitude</label>
              <input value={form.latitude} onChange={(e) => update('latitude', e.target.value)} placeholder="32.1877" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Longitude</label>
              <input value={form.longitude} onChange={(e) => update('longitude', e.target.value)} placeholder="74.1945" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={labelStyle}>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={labelStyle}>Features (comma-separated)</label>
            <input value={form.features} onChange={(e) => update('features', e.target.value)} placeholder="Canal front location, Gated & secure community" style={inputStyle} />
          </div>

          <div style={{ marginTop: '18px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
            <strong style={{ fontSize: '13px' }}>Media</strong>
            {uploading && (
              <span style={{ ...hintStyle, marginLeft: '10px', color: '#C9A84C' }}>
                Uploading — don&rsquo;t leave this page.
              </span>
            )}
            {error && (
              <div
                style={{
                  border: '1px solid rgba(239,68,68,0.5)',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  padding: '9px 12px',
                  fontSize: '12.5px',
                  marginTop: '10px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div>
                <label style={labelStyle}>Main image (the advert)</label>
                <input type="file" accept="image/*" onChange={(e) => pickMedia('featuredImage', e.target.files)} style={{ ...inputStyle, padding: '7px' }} />
                {form.featuredImage ? (
                  <div style={{ position: 'relative', display: 'inline-block', marginTop: '10px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaPreview(form.featuredImage)}
                      alt="Main"
                      style={{ width: '150px', height: '110px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)' }}
                    />
                    <button
                      type="button"
                      aria-label="Remove main image"
                      onClick={() => clearMedia('featuredImage')}
                      style={removeBadge}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <p style={hintStyle}>No main image. This is what shows on cards and at the top of the page.</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Gallery (site plan, brochure, photos…)</label>
                <input type="file" accept="image/*" multiple onChange={(e) => pickMedia('gallery', e.target.files)} style={{ ...inputStyle, padding: '7px' }} />
                {form.gallery.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {form.gallery.map((img: string, i: number) => (
                      <div key={i} style={{ position: 'relative' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaPreview(img)}
                          alt={`Gallery ${i + 1}`}
                          style={{ width: '92px', height: '70px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)' }}
                        />
                        <button
                          type="button"
                          aria-label={`Remove gallery image ${i + 1}`}
                          onClick={() => removeGalleryAt(i)}
                          style={removeBadge}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={hintStyle}>No gallery images yet.</p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={labelStyle}>Video (site visit, drone footage)</label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  onChange={(e) => pickMedia('videoUrl', e.target.files)}
                  style={{ ...inputStyle, padding: '7px' }}
                />
                {form.videoUrl ? (
                  <div style={{ marginTop: '10px' }}>
                    <video
                      src={mediaPreview(form.videoUrl)}
                      controls
                      muted
                      playsInline
                      style={{ width: '100%', maxWidth: '260px', border: '1px solid rgba(255,255,255,0.12)' }}
                    />
                    <div>
                      <button type="button" style={{ ...ghostButton, marginTop: '8px' }} onClick={() => clearMedia('videoUrl')}>
                        Remove video
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={hintStyle}>
                    MP4, WebM or MOV. No size limit here — but a large file costs every
                    visitor the download, so compress long clips where you can.
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Video poster (optional)</label>
                <input type="file" accept="image/*" onChange={(e) => pickMedia('videoPosterUrl', e.target.files)} style={{ ...inputStyle, padding: '7px' }} />
                {form.videoPosterUrl ? (
                  <div style={{ position: 'relative', display: 'inline-block', marginTop: '10px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaPreview(form.videoPosterUrl)}
                      alt="Video poster"
                      style={{ width: '150px', height: '110px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)' }}
                    />
                    <button type="button" aria-label="Remove poster" onClick={() => clearMedia('videoPosterUrl')} style={removeBadge}>
                      ×
                    </button>
                  </div>
                ) : (
                  <p style={hintStyle}>Shown before the video plays. Defaults to the main image.</p>
                )}
              </div>
            </div>

            <div style={{ marginTop: '16px', maxWidth: '520px' }}>
              <label style={labelStyle}>Brochure (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => pickMedia('brochureUrl', e.target.files)}
                style={{ ...inputStyle, padding: '7px' }}
              />
              {form.brochureUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <span style={{ fontSize: '12.5px' }}>
                    📄 {form.brochureName || 'Brochure attached'}
                  </span>
                  <button
                    type="button"
                    style={ghostButton}
                    onClick={() => clearMedia('brochureUrl')}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p style={hintStyle}>
                  Adds a &ldquo;Download Brochure&rdquo; button to the public page.
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginTop: '14px', fontSize: '12px' }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value)} style={{ ...inputStyle, cursor: 'pointer', width: '160px' }}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer', marginTop: '18px' }}>
              <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} /> Featured
            </label>
            <a href="/admin/verification" style={{ display: 'flex', alignItems: 'center', marginTop: '18px', fontSize: '12px', color: '#C9A84C' }}>
              {form.verified ? '✓ Verified — manage in Verification' : 'Verify in Admin → Verification'}
            </a>
          </div>

          <div style={{ marginTop: '22px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ fontSize: '13px' }}>Plot variants</strong>
              <button type="button" style={ghostButton} onClick={() => setUnits((u) => [...u, emptyUnit()])}>+ Add plot size</button>
            </div>
            {units.map((u, i) => (
              <UnitEditor
                key={i}
                unit={u}
                currency={form.currency}
                onChange={(next) => setUnits((list) => list.map((x, j) => (j === i ? next : x)))}
                onRemove={() => {
                  if (u.id) setRemovedUnitIds((ids) => [...ids, u.id])
                  setUnits((list) => list.filter((_, j) => j !== i))
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '18px' }}>
            <button
              type="submit"
              disabled={saving || !!uploading}
              style={{ ...buttonStyle, opacity: saving || uploading ? 0.6 : 1 }}
            >
              {uploading ? 'Uploading…' : saving ? 'Saving…' : editingId ? 'Save changes' : 'Create development'}
            </button>
            <button type="button" style={ghostButton} onClick={resetForm}>Cancel</button>
            {editingId && (
              <span style={hintStyle}>
                Removed plot variants are only deleted when you save.
              </span>
            )}
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ opacity: 0.6 }}>Loading…</p>
      ) : developments.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ margin: 0 }}>No developments yet.</p>
          <p style={hintStyle}>Create one to publish a multi-plot scheme like Citi Canal Enclave.</p>
        </div>
      ) : (
        developments.map((dev) => (
          <div key={dev.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '15px' }}>{dev.name}</strong>
                  <Chip value={dev.status} />
                  {dev.featured && <span style={{ fontSize: '11px', color: '#C9A84C' }}>★ Featured</span>}
                  {dev.verified && <span style={{ fontSize: '11px', color: '#22c55e' }}>✓ Verified</span>}
                </div>
                <p style={{ ...hintStyle, marginTop: '4px' }}>
                  {[dev.city, dev.province_state, dev.country].filter(Boolean).join(', ')}
                  {dev.developer_name ? ` · ${dev.developer_name}` : ''}
                  {dev.marketing_agent ? ` · marketed by ${dev.marketing_agent}` : ''}
                </p>
                <p style={hintStyle}>
                  /property-portal/developments/{dev.slug} · {dev.development_units?.length || 0} plot variant(s)
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button style={{ ...ghostButton, borderColor: 'rgba(201,168,76,0.55)', color: '#C9A84C' }} onClick={() => openEdit(dev)}>
                  Edit
                </button>
                <button style={ghostButton} onClick={() => setExpanded(expanded === dev.id ? null : dev.id)}>
                  {expanded === dev.id ? 'Hide' : 'Variants'}
                </button>
                <button
                  style={ghostButton}
                  onClick={() => patchDevelopment(dev.id, { status: dev.status === 'published' ? 'draft' : 'published' }, dev.status === 'published' ? 'Unpublished.' : 'Published.')}
                >
                  {dev.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button style={ghostButton} onClick={() => patchDevelopment(dev.id, { featured: !dev.featured }, dev.featured ? 'Unfeatured.' : 'Featured.')}>
                  {dev.featured ? 'Unfeature' : 'Feature'}
                </button>
                <a href="/admin/verification" style={{ ...ghostButton, textDecoration: 'none' }}>
                  {dev.verified ? 'Verification…' : 'Verify…'}
                </a>
                <button style={ghostButton} onClick={() => duplicateDevelopment(dev)}>Duplicate</button>
                <button style={{ ...ghostButton, borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }} onClick={() => removeDevelopment(dev)}>Delete</button>
              </div>
            </div>

            {expanded === dev.id && (
              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                <p style={{ ...hintStyle, marginBottom: '10px' }}>
                  Availability can be changed here. For sizes, prices and payment plans use{' '}
                  <button
                    type="button"
                    onClick={() => openEdit(dev)}
                    style={{ background: 'none', border: 0, padding: 0, color: '#C9A84C', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
                  >
                    Edit
                  </button>.
                </p>
                {(dev.development_units || []).length === 0 ? (
                  <p style={hintStyle}>No plot variants yet.</p>
                ) : (
                  <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', opacity: 0.6 }}>
                        <th style={{ padding: '6px' }}>Variant</th>
                        <th style={{ padding: '6px' }}>Size</th>
                        <th style={{ padding: '6px' }}>Price</th>
                        <th style={{ padding: '6px' }}>Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...dev.development_units]
                        .sort((a: Row, b: Row) => (a.display_order ?? 0) - (b.display_order ?? 0))
                        .map((u: Row) => (
                          <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <td style={{ padding: '7px 6px' }}>{u.title}</td>
                            <td style={{ padding: '7px 6px' }}>{formatPlotSize(u.plot_size, u.plot_size_unit) || '—'}</td>
                            <td style={{ padding: '7px 6px' }}>{formatMoney(u.total_price, u.currency)}</td>
                            <td style={{ padding: '7px 6px' }}>
                              <select
                                value={u.availability_status}
                                onChange={(e) => setUnitAvailability(u.id, e.target.value)}
                                style={{ ...inputStyle, padding: '5px 8px', width: 'auto', cursor: 'pointer' }}
                              >
                                {AVAILABILITY_STATUSES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
