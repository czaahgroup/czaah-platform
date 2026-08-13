'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'


interface Property {
  id: string
  title: string
  property_type: string
  listing_type: string
  price: number | null
  currency: string
  location: string
  city: string
  country: string | null
  area_sqft: number | null
  bedrooms: number | null
  bathrooms: number | null
  description: string | null
  features: string[]
  images: string[]
  yield_percentage: number | null
  status: string
  rejection_notes: string | null
  partner_id: string | null
  created_at: string
  profiles: { full_name: string; email: string } | null
}

type TabFilter = 'all' | 'pending' | 'approved' | 'rejected'

const statusStyles: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  approved: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  rejected: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  sold: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
  inactive: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
}

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
  { value: 'off_plan', label: 'Off Plan' },
]

const emptyForm = {
  title: '',
  propertyType: '',
  listingType: '',
  price: '',
  currency: 'USD',
  location: '',
  city: '',
  country: '',
  areaSqft: '',
  bedrooms: '',
  bathrooms: '',
  description: '',
  features: '',
  images: '',
  yieldPercentage: '',
}

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

function PropertyFormFields({ form, setForm }: { form: typeof emptyForm; setForm: (fn: (f: typeof emptyForm) => typeof emptyForm) => void }) {
  const update = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="space-y-4">
      <div>
        <label style={labelStyle}>Title *</label>
        <input type="text" required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Canary Wharf — Riverside Residences" style={inputStyle} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Property Type *</label>
          <select required value={form.propertyType} onChange={(e) => update('propertyType', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Select type...</option>
            {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Listing Type *</label>
          <select required value={form.listingType} onChange={(e) => update('listingType', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Select...</option>
            {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Price</label>
          <input type="number" value={form.price} onChange={(e) => update('price', e.target.value)} placeholder="e.g. 950000" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Currency</label>
          <select value={form.currency} onChange={(e) => update('currency', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {['USD', 'GBP', 'AED', 'SAR', 'QAR', 'PKR'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Yield %</label>
          <input type="number" step="0.1" value={form.yieldPercentage} onChange={(e) => update('yieldPercentage', e.target.value)} placeholder="e.g. 7.5" style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Location *</label>
          <input type="text" required value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="e.g. Canary Wharf" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>City *</label>
          <input type="text" required value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. London" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Country</label>
          <input type="text" value={form.country} onChange={(e) => update('country', e.target.value)} placeholder="e.g. United Kingdom" style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Area (sq ft)</label>
          <input type="number" value={form.areaSqft} onChange={(e) => update('areaSqft', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Bedrooms</label>
          <input type="number" value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Bathrooms</label>
          <input type="number" value={form.bathrooms} onChange={(e) => update('bathrooms', e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Description</label>
        <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} style={{ ...inputStyle, resize: 'none' }} />
      </div>

      <div>
        <label style={labelStyle}>Features (comma-separated)</label>
        <input type="text" value={form.features} onChange={(e) => update('features', e.target.value)} placeholder="e.g. Concierge, Gym, River Views" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Image URLs or storage paths (comma-separated)</label>
        <input type="text" value={form.images} onChange={(e) => update('images', e.target.value)} placeholder="/Images/canary-wharf.jpg" style={inputStyle} />
      </div>
    </div>
  )
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(emptyForm)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [deleteLoading, setDeleteLoading] = useState(false)

  async function loadProperties() {
    setLoading(true)
    try {
      const params = tab !== 'all' ? `?status=${tab}` : ''
      const res = await fetch(`/api/admin/properties${params}`)
      const json = await res.json()
      if (res.ok) setProperties(json.data || [])
    } catch (err) {
      console.error('Failed to load properties:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProperties()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = properties.find((p) => p.id === selectedId)

  async function handleAction(action: 'approve' | 'reject') {
    if (!selectedId) return
    setActionLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/admin/properties/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: rejectNotes || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Failed to ${action}`)
      setSuccess(`Property ${action === 'approve' ? 'approved' : 'rejected'} successfully.`)
      setRejectNotes('')
      setSelectedId(null)
      await loadProperties()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    try {
      const res = await fetch('/api/admin/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create property')
      setSuccess('Property created and published successfully.')
      setAddForm(emptyForm)
      setShowAddForm(false)
      await loadProperties()
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to create property')
    } finally {
      setAddLoading(false)
    }
  }

  function startEdit() {
    if (!selected) return
    setEditForm({
      title: selected.title || '',
      propertyType: selected.property_type || '',
      listingType: selected.listing_type || '',
      price: selected.price != null ? String(selected.price) : '',
      currency: selected.currency || 'USD',
      location: selected.location || '',
      city: selected.city || '',
      country: selected.country || '',
      areaSqft: selected.area_sqft != null ? String(selected.area_sqft) : '',
      bedrooms: selected.bedrooms != null ? String(selected.bedrooms) : '',
      bathrooms: selected.bathrooms != null ? String(selected.bathrooms) : '',
      description: selected.description || '',
      features: (selected.features || []).join(', '),
      images: (selected.images || []).join(', '),
      yieldPercentage: selected.yield_percentage != null ? String(selected.yield_percentage) : '',
    })
    setEditError(null)
    setEditMode(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/admin/properties/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update property')
      setSuccess('Property updated successfully.')
      setEditMode(false)
      await loadProperties()
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update property')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!window.confirm('Permanently delete this property listing? This cannot be undone.')) return
    setDeleteLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/properties/${selectedId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete property')
      setSuccess('Property deleted.')
      setSelectedId(null)
      setEditMode(false)
      await loadProperties()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete property')
    } finally {
      setDeleteLoading(false)
    }
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Properties</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedId(null); setEditMode(false); setError(null); setSuccess(null) }}
              className={`px-4 py-1.5 rounded-nonetext-sm transition-colors ${
                tab === t.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => { setShowAddForm((v) => !v); setSelectedId(null); setEditMode(false); setAddError(null) }}
            className={`px-4 py-1.5 rounded-nonetext-sm font-semibold transition-colors ${
              showAddForm
                ? 'bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
                : 'bg-primary text-on-primary hover:opacity-90'
            }`}
          >
            {showAddForm ? 'Cancel' : '+ Add Property'}
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-none px-4 py-3 mb-4">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-6 mb-6"
        >
          <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-4">New CZAAH-Direct Listing</h2>
          {addError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-4">
              <p className="text-sm text-red-400">{addError}</p>
            </div>
          )}
          <PropertyFormFields form={addForm} setForm={setAddForm} />
          <button
            type="submit"
            disabled={addLoading}
            className="mt-5 bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-nonetext-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {addLoading ? 'Creating...' : 'Publish Property'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center">Loading properties...</div>
      ) : properties.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-16 text-center">
          <p className="text-on-surface-variant">No properties found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Table */}
          <div className="xl:col-span-2">
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/10">
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium">Title</th>
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium hidden md:table-cell">Partner</th>
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium hidden lg:table-cell">City</th>
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium hidden sm:table-cell">Type</th>
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium">Status</th>
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((prop) => {
                      const sc = statusStyles[prop.status] || statusStyles.inactive
                      return (
                        <tr
                          key={prop.id}
                          onClick={() => { setSelectedId(prop.id); setEditMode(false); setError(null); setSuccess(null); setRejectNotes('') }}
                          className={`border-b border-outline-variant/10/50 cursor-pointer transition-colors ${
                            selectedId === prop.id ? 'bg-primary/5' : 'hover:bg-surface-container-lowest/30'
                          }`}
                        >
                          <td className="px-5 py-3">
                            <span className="text-on-surface font-medium">{prop.title}</span>
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant hidden md:table-cell">{prop.profiles?.full_name || '-'}</td>
                          <td className="px-5 py-3 text-on-surface-variant hidden lg:table-cell">{prop.city}</td>
                          <td className="px-5 py-3 text-on-surface-variant hidden sm:table-cell capitalize">{prop.property_type.replace('_', ' ')}</td>
                          <td className="px-5 py-3">
                            <span style={{ background: sc.bg, color: sc.text, padding: '3px 10px', borderRadius: 0, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{prop.status}</span>
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant/50 hidden sm:table-cell">{new Date(prop.created_at).toLocaleDateString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant/50 mt-3">{properties.length} property listing(s)</p>
          </div>

          {/* Detail panel */}
          <div>
            {selected && editMode ? (
              <form
                onSubmit={handleEditSubmit}
                className="bg-surface-container-low border border-outline-variant/10 rounded-none sticky top-8 px-6 py-5"
              >
                <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-4">Edit Property</h2>
                {editError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-4">
                    <p className="text-sm text-red-400">{editError}</p>
                  </div>
                )}
                <PropertyFormFields form={editForm} setForm={setEditForm} />
                <div className="flex gap-3 mt-5">
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 bg-primary text-on-primary font-semibold py-2.5 rounded-nonetext-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-5 py-2.5 rounded-nonetext-sm bg-surface-container-lowest border border-outline-variant/10 text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : selected ? (
              <div className="bg-surface-container-low border border-outline-variant/10 rounded-none sticky top-8">
                {/* Images */}
                {selected.images && selected.images.length > 0 && (
                  <div style={{ height: '180px', overflow: 'hidden' }}>
                    <img
                      src={
                        selected.images[0].startsWith('http') || selected.images[0].startsWith('/')
                          ? selected.images[0]
                          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/platform-files/${selected.images[0]}`
                      }
                      alt={selected.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <div className="px-6 py-4 border-b border-outline-variant/10">
                  <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">{selected.title}</h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {selected.profiles ? `${selected.profiles.full_name} (${selected.profiles.email})` : 'CZAAH Direct Listing'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {(() => { const sc = statusStyles[selected.status] || statusStyles.inactive; return <span style={{ background: sc.bg, color: sc.text, padding: '3px 10px', borderRadius: 0, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{selected.status}</span> })()}
                  </div>
                </div>

                <div className="px-6 py-4 border-b border-outline-variant/10 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-on-surface-variant">Type</p><p className="text-sm text-on-surface capitalize">{selected.property_type.replace('_', ' ')}</p></div>
                    <div><p className="text-xs text-on-surface-variant">Listing</p><p className="text-sm text-on-surface capitalize">{selected.listing_type}</p></div>
                    <div><p className="text-xs text-on-surface-variant">Price</p><p className="text-sm text-on-surface">{selected.price ? `${selected.currency} ${selected.price.toLocaleString()}` : 'On request'}</p></div>
                    <div><p className="text-xs text-on-surface-variant">City</p><p className="text-sm text-on-surface">{selected.city}</p></div>
                    <div><p className="text-xs text-on-surface-variant">Location</p><p className="text-sm text-on-surface">{selected.location}</p></div>
                    <div><p className="text-xs text-on-surface-variant">Area</p><p className="text-sm text-on-surface">{selected.area_sqft ? `${selected.area_sqft.toLocaleString()} sq ft` : '-'}</p></div>
                    {selected.bedrooms != null && <div><p className="text-xs text-on-surface-variant">Beds</p><p className="text-sm text-on-surface">{selected.bedrooms}</p></div>}
                    {selected.bathrooms != null && <div><p className="text-xs text-on-surface-variant">Baths</p><p className="text-sm text-on-surface">{selected.bathrooms}</p></div>}
                  </div>
                  {selected.description && (
                    <div className="pt-2">
                      <p className="text-xs text-on-surface-variant">Description</p>
                      <p className="text-sm text-on-surface mt-0.5 line-clamp-4">{selected.description}</p>
                    </div>
                  )}
                  {selected.features && selected.features.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-on-surface-variant mb-1">Features</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {selected.features.map((f, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-nonebg-primary/10 text-primary border border-primary/20">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rejection notes display */}
                {selected.status === 'rejected' && selected.rejection_notes && (
                  <div className="px-6 py-4 border-b border-outline-variant/10">
                    <p className="text-xs text-red-400 font-semibold mb-1">Rejection Notes</p>
                    <p className="text-sm text-on-surface-variant">{selected.rejection_notes}</p>
                  </div>
                )}

                {/* Actions (only for pending) */}
                {selected.status === 'pending' && (
                  <div className="px-6 py-4">
                    <div className="space-y-3">
                      <button
                        onClick={() => handleAction('approve')}
                        disabled={actionLoading}
                        className="w-full bg-green-500/20 text-green-400 font-semibold py-2.5 rounded-nonetext-sm hover:bg-green-500/30 transition-colors disabled:opacity-50 border border-green-500/30"
                      >
                        {actionLoading ? 'Processing...' : 'Approve Property'}
                      </button>
                      <div>
                        <textarea
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          placeholder="Rejection reason (optional)..."
                          rows={2}
                          className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-red-500/30 mb-2"
                          style={{ resize: 'none' }}
                        />
                        <button
                          onClick={() => handleAction('reject')}
                          disabled={actionLoading}
                          className="w-full bg-red-500/20 text-red-400 font-semibold py-2.5 rounded-nonetext-sm hover:bg-red-500/30 transition-colors disabled:opacity-50 border border-red-500/30"
                        >
                          Reject Property
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit / Delete — available for any listing */}
                <div className="px-6 py-4 flex gap-3">
                  <button
                    onClick={startEdit}
                    className="flex-1 bg-surface-container-lowest border border-outline-variant/10 text-on-surface font-semibold py-2.5 rounded-nonetext-sm hover:bg-primary/10 hover:border-primary/30 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 bg-red-500/10 text-red-400 font-semibold py-2.5 rounded-nonetext-sm hover:bg-red-500/20 transition-colors disabled:opacity-50 border border-red-500/20"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low border border-outline-variant/10 rounded-none flex items-center justify-center py-16">
                <p className="text-on-surface-variant text-sm">Select a property to review</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
