'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Property {
  id: string
  title: string
  property_type: string
  listing_type: string
  price: number | null
  currency: string
  location: string
  city: string
  area_sqft: number | null
  bedrooms: number | null
  bathrooms: number | null
  description: string | null
  features: string[]
  images: string[]
  status: string
  rejection_notes: string | null
  created_at: string
  updated_at: string
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  approved: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  rejected: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  sold: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
  inactive: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
}

export default function PropertyDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/partner/properties/${id}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load')
        setProperty(json.data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load property')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this property?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/partner/properties/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to delete')
      }
      router.push('/dashboard/properties')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  function startEditing() {
    if (!property) return
    setEditForm({
      title: property.title,
      propertyType: property.property_type,
      listingType: property.listing_type,
      price: property.price?.toString() || '',
      currency: property.currency,
      location: property.location,
      city: property.city,
      areaSqft: property.area_sqft?.toString() || '',
      bedrooms: property.bedrooms?.toString() || '',
      bathrooms: property.bathrooms?.toString() || '',
      description: property.description || '',
      features: property.features?.join(', ') || '',
    })
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/partner/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          price: editForm.price ? Number(editForm.price) : null,
          areaSqft: editForm.areaSqft ? Number(editForm.areaSqft) : null,
          bedrooms: editForm.bedrooms ? Number(editForm.bedrooms) : null,
          bathrooms: editForm.bathrooms ? Number(editForm.bathrooms) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update')
      setProperty(json.data)
      setEditing(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ color: 'rgba(255,255,255,0.4)', padding: '48px 0', textAlign: 'center', fontFamily: "'Raleway', sans-serif" }}>Loading...</div>
  }

  if (!property) {
    return <div style={{ color: '#ef4444', padding: '48px 0', textAlign: 'center', fontFamily: "'Raleway', sans-serif" }}>{error || 'Property not found'}</div>
  }

  const sc = statusStyles[property.status] || statusStyles.inactive
  const isPending = property.status === 'pending'
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '0px',
    padding: '10px 14px',
    color: '#fff',
    fontFamily: "'Raleway', sans-serif",
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <button onClick={() => router.push('/dashboard/properties')} style={{ background: 'none', border: 'none', color: 'rgba(201,168,76,0.6)', cursor: 'pointer', fontFamily: "'Raleway', sans-serif", fontSize: '13px', padding: 0, marginBottom: '24px' }}>
        &larr; Back to My Properties
      </button>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0px', padding: '12px 16px', marginBottom: '16px' }}>
          <p style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: '#fff', margin: 0, flex: 1 }}>
          {editing ? (
            <input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} style={{ ...inputStyle, fontFamily: "'Cinzel', serif", fontSize: '22px' }} />
          ) : property.title}
        </h1>
        <span style={{
          background: sc.bg,
          color: sc.text,
          padding: '5px 14px',
          borderRadius: '0px',
          fontSize: '11px',
          fontFamily: "'Raleway', sans-serif",
          fontWeight: 600,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          {property.status}
        </span>
      </div>

      {property.status === 'rejected' && property.rejection_notes && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '0px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#ef4444', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Rejection Notes</p>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>{property.rejection_notes}</p>
        </div>
      )}

      {/* Images */}
      {property.images && property.images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {property.images.map((img, idx) => (
            <div key={idx} style={{ borderRadius: '0px', overflow: 'hidden', aspectRatio: '4/3', background: 'rgba(255,255,255,0.03)' }}>
              <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/platform-files/${img}`} alt={`Property ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}

      {/* Details */}
      <div style={{ background: '#0e0e0e', border: '1px solid rgba(77,70,55,0.25)', borderRadius: '0px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {[
            { label: 'Type', key: 'propertyType', value: property.property_type.replace('_', ' ') },
            { label: 'Listing', key: 'listingType', value: property.listing_type },
            { label: 'Price', key: 'price', value: property.price ? `${property.currency} ${property.price.toLocaleString()}` : 'Price on request' },
            { label: 'Location', key: 'location', value: property.location },
            { label: 'City', key: 'city', value: property.city },
            { label: 'Area', key: 'areaSqft', value: property.area_sqft ? `${property.area_sqft.toLocaleString()} sq ft` : '-' },
            { label: 'Bedrooms', key: 'bedrooms', value: property.bedrooms?.toString() || '-' },
            { label: 'Bathrooms', key: 'bathrooms', value: property.bathrooms?.toString() || '-' },
          ].map(({ label, key, value }) => (
            <div key={label}>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>{label}</p>
              {editing ? (
                <input value={editForm[key] || ''} onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
              ) : (
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#fff', margin: 0, textTransform: 'capitalize' }}>{value}</p>
              )}
            </div>
          ))}
        </div>

        {(property.description || editing) && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(77,70,55,0.25)' }}>
            <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Description</p>
            {editing ? (
              <textarea value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} rows={4} style={{ ...inputStyle, resize: 'vertical' as const }} />
            ) : (
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.7 }}>{property.description}</p>
            )}
          </div>
        )}

        {(property.features?.length > 0 || editing) && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(77,70,55,0.25)' }}>
            <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Features</p>
            {editing ? (
              <input value={editForm.features} onChange={(e) => setEditForm((p) => ({ ...p, features: e.target.value }))} style={inputStyle} placeholder="Comma-separated" />
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {property.features.map((f, i) => (
                  <span key={i} style={{
                    background: 'rgba(201,168,76,0.08)',
                    border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: '0px',
                    padding: '4px 10px',
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '12px',
                    color: 'rgba(201,168,76,0.7)',
                  }}>{f}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0px', padding: '10px 20px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Raleway', sans-serif", fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)', color: '#000', padding: '10px 24px', borderRadius: '0px', border: 'none', fontFamily: "'Raleway', sans-serif", fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </>
          ) : (
            <>
              <button onClick={handleDelete} disabled={deleting} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0px', padding: '10px 20px', color: '#ef4444', fontFamily: "'Raleway', sans-serif", fontSize: '13px', cursor: deleting ? 'not-allowed' : 'pointer' }}>{deleting ? 'Deleting...' : 'Delete'}</button>
              <button onClick={startEditing} style={{ background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)', color: '#000', padding: '10px 24px', borderRadius: '0px', border: 'none', fontFamily: "'Raleway', sans-serif", fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Edit Listing</button>
            </>
          )}
        </div>
      )}

      <style>{`
        input:focus, textarea:focus { border-color: rgba(201,168,76,0.4) !important; }
      `}</style>
    </div>
  )
}
