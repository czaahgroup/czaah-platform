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
}

/** Reads a picked file as a data URL — the API turns it into a storage path. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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

  async function pickImage(key: 'featuredImage' | 'gallery', files: FileList | null) {
    if (!files?.length) return
    const urls = await Promise.all(Array.from(files).slice(0, 12).map(readAsDataUrl))
    if (key === 'featuredImage') update('featuredImage', urls[0])
    else update('gallery', [...form.gallery, ...urls])
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    setWarnings([])
    try {
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
      setForm({ ...emptyForm })
      setUnits([emptyUnit()])
      setCreating(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the development.')
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
        <button style={buttonStyle} onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : '+ New development'}
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

      {creating && (
        <form onSubmit={submit} style={{ ...cardStyle, padding: '20px', marginBottom: '26px' }}>
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
              <input value={form.marketingAgent} onChange={(e) => update('marketingAgent', e.target.value)} placeholder="Gold Mark" style={inputStyle} />
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={labelStyle}>Main image (the advert)</label>
              <input type="file" accept="image/*" onChange={(e) => pickImage('featuredImage', e.target.files)} style={{ ...inputStyle, padding: '7px' }} />
              {form.featuredImage && <p style={hintStyle}>1 image ready to upload.</p>}
            </div>
            <div>
              <label style={labelStyle}>Gallery (site plan, brochure, map…)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => pickImage('gallery', e.target.files)} style={{ ...inputStyle, padding: '7px' }} />
              {form.gallery.length > 0 && <p style={hintStyle}>{form.gallery.length} image(s) ready to upload.</p>}
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
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer', marginTop: '18px' }}>
              <input type="checkbox" checked={form.verified} onChange={(e) => update('verified', e.target.checked)} /> Verified
            </label>
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
                onRemove={() => setUnits((list) => list.filter((_, j) => j !== i))}
              />
            ))}
          </div>

          <button type="submit" disabled={saving} style={{ ...buttonStyle, marginTop: '18px', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Create development'}
          </button>
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
                <button style={ghostButton} onClick={() => patchDevelopment(dev.id, { verified: !dev.verified }, dev.verified ? 'Verification removed.' : 'Verified.')}>
                  {dev.verified ? 'Unverify' : 'Verify'}
                </button>
                <button style={ghostButton} onClick={() => duplicateDevelopment(dev)}>Duplicate</button>
                <button style={{ ...ghostButton, borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }} onClick={() => removeDevelopment(dev)}>Delete</button>
              </div>
            </div>

            {expanded === dev.id && (
              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
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
