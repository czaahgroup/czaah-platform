'use client'
// @ts-nocheck

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PORTAL_COUNTRIES } from '@/app/property-portal/_components/types'
import { PhotoUploader, FeatureChips, splitPaths } from '@/components/PhotoUploader'
import { PARTNER_MAX_PHOTOS } from '@/lib/uploadSafety'

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
]

export default function AddPropertyPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    propertyType: '',
    listingType: '',
    price: '',
    currency: 'PKR',
    location: '',
    city: '',
    country: '',
    areaSqft: '',
    bedrooms: '',
    bathrooms: '',
    description: '',
    features: '',
    rentPeriod: 'month',
    furnishing: '',
    availableFrom: '',
    deposit: '',
    minTermMonths: '',
  })
  const isRentalListing = form.listingType === 'rent' || form.listingType === 'lease'
  // Photos upload straight to storage as they are picked; the form keeps their paths.
  const [photos, setPhotos] = useState('')
  const [uploadsInFlight, setUploadsInFlight] = useState(0)
  const onBusyChange = (busy: boolean) => setUploadsInFlight((n) => Math.max(0, n + (busy ? 1 : -1)))

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/partner/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: form.price ? Number(form.price) : null,
          areaSqft: form.areaSqft ? Number(form.areaSqft) : null,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
          deposit: form.deposit ? Number(form.deposit) : null,
          minTermMonths: form.minTermMonths ? Number(form.minTermMonths) : null,
          images: splitPaths(photos),
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create property')

      router.push('/dashboard/properties')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create property')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '0px',
    padding: '12px 16px',
    color: '#fff',
    fontFamily: "'Raleway', sans-serif",
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    boxSizing: 'border-box' as const,
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Raleway', sans-serif",
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    marginBottom: '6px',
    display: 'block',
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '24px', color: '#fff', margin: '0 0 8px' }}>Add Property</h1>
      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 32px' }}>
        Submit a new property listing. It will be reviewed by an admin before going live.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0px', padding: '12px 16px', marginBottom: '24px' }}>
          <p style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#0e0e0e', border: '1px solid rgba(77,70,55,0.25)', borderRadius: '0px', padding: '32px', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: 'rgba(201,168,76,0.7)', margin: '0 0 24px', letterSpacing: '2px' }}>Basic Details</h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Blue Area Office Tower - Full Floor"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Property Type *</label>
              <select
                required
                value={form.propertyType}
                onChange={(e) => updateField('propertyType', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select type...</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Listing Type *</label>
              <select
                required
                value={form.listingType}
                onChange={(e) => updateField('listingType', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select...</option>
                {LISTING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>{isRentalListing ? 'Rent' : 'Price'}</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                placeholder={isRentalListing ? 'e.g. 150000' : 'e.g. 5000000'}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => updateField('currency', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="PKR">PKR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="AED">AED</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {isRentalListing && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Rent Is Per</label>
                <select
                  value={form.rentPeriod}
                  onChange={(e) => updateField('rentPeriod', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Deposit</label>
                <input
                  type="number"
                  value={form.deposit}
                  onChange={(e) => updateField('deposit', e.target.value)}
                  placeholder="Same currency as rent"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Min. Term (months)</label>
                <input
                  type="number"
                  min={1}
                  value={form.minTermMonths}
                  onChange={(e) => updateField('minTermMonths', e.target.value)}
                  placeholder="e.g. 12"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Furnishing</label>
                <select
                  value={form.furnishing}
                  onChange={(e) => updateField('furnishing', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Not stated</option>
                  <option value="furnished">Furnished</option>
                  <option value="part_furnished">Part furnished</option>
                  <option value="unfurnished">Unfurnished</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Available From</label>
                <input
                  type="date"
                  value={form.availableFrom}
                  onChange={(e) => updateField('availableFrom', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ background: '#0e0e0e', border: '1px solid rgba(77,70,55,0.25)', borderRadius: '0px', padding: '32px', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: 'rgba(201,168,76,0.7)', margin: '0 0 24px', letterSpacing: '2px' }}>Location & Specs</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Location *</label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g. Blue Area, Jinnah Avenue"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>City *</label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="e.g. Islamabad"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Country *</label>
              <select
                required
                value={form.country}
                onChange={(e) => updateField('country', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select a country…</option>
                {PORTAL_COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'rgba(228,224,218,0.5)' }}>
                The portal only publishes these markets — a listing without one never appears.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Area (sq ft)</label>
              <input
                type="number"
                value={form.areaSqft}
                onChange={(e) => updateField('areaSqft', e.target.value)}
                placeholder="e.g. 12000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Bedrooms</label>
              <input
                type="number"
                value={form.bedrooms}
                onChange={(e) => updateField('bedrooms', e.target.value)}
                placeholder="e.g. 3"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Bathrooms</label>
              <input
                type="number"
                value={form.bathrooms}
                onChange={(e) => updateField('bathrooms', e.target.value)}
                placeholder="e.g. 2"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={{ background: '#0e0e0e', border: '1px solid rgba(77,70,55,0.25)', borderRadius: '0px', padding: '32px', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: 'rgba(201,168,76,0.7)', margin: '0 0 24px', letterSpacing: '2px' }}>Description & Features</h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the property, its surroundings, and investment potential..."
              rows={5}
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Features (comma-separated)</label>
            <input
              type="text"
              value={form.features}
              onChange={(e) => updateField('features', e.target.value)}
              placeholder="Tap below, or type your own separated by commas"
              style={inputStyle}
            />
            <FeatureChips value={form.features} onChange={(v) => updateField('features', v)} />
          </div>
        </div>

        <div style={{ background: '#0e0e0e', border: '1px solid rgba(77,70,55,0.25)', borderRadius: '0px', padding: '32px', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: 'rgba(201,168,76,0.7)', margin: '0 0 24px', letterSpacing: '2px' }}>Images</h2>

          <PhotoUploader
            value={photos}
            title={form.title}
            onChange={setPhotos}
            onBusyChange={onBusyChange}
            endpoint="/api/partner/media/upload-url"
            maxPhotos={PARTNER_MAX_PHOTOS}
            allowLinks={false}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0px',
              padding: '12px 24px',
              color: 'rgba(255,255,255,0.5)',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || uploadsInFlight > 0}
            style={{
              background: submitting ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)',
              color: '#000',
              padding: '12px 32px',
              borderRadius: '0px',
              border: 'none',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.5px',
            }}
          >
            {uploadsInFlight > 0 ? 'Uploading photos...' : submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </form>

      <style>{`
        select option { background: #131313; color: #fff; }
        input:focus, select:focus, textarea:focus { border-color: rgba(201,168,76,0.4) !important; }
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: 2fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: 1fr 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
