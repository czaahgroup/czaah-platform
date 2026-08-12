'use client'
// @ts-nocheck

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    areaSqft: '',
    bedrooms: '',
    bathrooms: '',
    description: '',
    features: '',
  })
  const [imageFiles, setImageFiles] = useState<{ name: string; preview: string; data: string }[]>([])

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (imageFiles.length >= 10) return
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setImageFiles((prev) => {
          if (prev.length >= 10) return prev
          return [...prev, { name: file.name, preview: result, data: result }]
        })
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
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
          images: imageFiles.map((img) => img.data),
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
              <label style={labelStyle}>Price</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                placeholder="e.g. 5000000"
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
              placeholder="e.g. Parking, Security, Garden, Elevator, Central Heating"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ background: '#0e0e0e', border: '1px solid rgba(77,70,55,0.25)', borderRadius: '0px', padding: '32px', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: 'rgba(201,168,76,0.7)', margin: '0 0 24px', letterSpacing: '2px' }}>Images</h2>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: '0px',
              padding: '24px',
              width: '100%',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
              marginBottom: imageFiles.length > 0 ? '16px' : '0',
            }}
          >
            Click to upload images (max 10)
          </button>

          {imageFiles.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
              {imageFiles.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', borderRadius: '0px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(255,255,255,0.03)' }}>
                  <img src={img.preview} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
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
            disabled={submitting}
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
            {submitting ? 'Submitting...' : 'Submit for Approval'}
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
