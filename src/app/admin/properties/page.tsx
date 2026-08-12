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
  area_sqft: number | null
  bedrooms: number | null
  bathrooms: number | null
  description: string | null
  features: string[]
  images: string[]
  status: string
  rejection_notes: string | null
  partner_id: string
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

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedId(null); setError(null); setSuccess(null) }}
              className={`px-4 py-1.5 rounded-nonetext-sm transition-colors ${
                tab === t.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
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
                          onClick={() => { setSelectedId(prop.id); setError(null); setSuccess(null); setRejectNotes('') }}
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
            {selected ? (
              <div className="bg-surface-container-low border border-outline-variant/10 rounded-none sticky top-8">
                {/* Images */}
                {selected.images && selected.images.length > 0 && (
                  <div style={{ height: '180px', overflow: 'hidden' }}>
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/platform-files/${selected.images[0]}`}
                      alt={selected.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <div className="px-6 py-4 border-b border-outline-variant/10">
                  <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">{selected.title}</h2>
                  <p className="text-sm text-on-surface-variant mt-1">{selected.profiles?.full_name} ({selected.profiles?.email})</p>
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
