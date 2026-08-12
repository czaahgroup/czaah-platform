'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

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
  status: string
  rejection_notes: string | null
  created_at: string
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  approved: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  rejected: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  sold: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
  inactive: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
}

export default function MyPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/partner/properties')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load')
        setProperties(json.data || [])
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load properties')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function formatPrice(price: number | null, currency: string) {
    if (!price) return 'Price on request'
    return `${currency} ${price.toLocaleString()}`
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '24px', color: '#fff', margin: 0 }}>My Properties</h1>
        <Link
          href="/dashboard/properties/new"
          style={{
            background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)',
            color: '#000',
            padding: '10px 24px',
            borderRadius: '0px',
            textDecoration: 'none',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          + Add Property
        </Link>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0px', padding: '12px 16px', marginBottom: '24px' }}>
          <p style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', padding: '48px 0', textAlign: 'center', fontFamily: "'Raleway', sans-serif", fontSize: '14px' }}>Loading properties...</div>
      ) : properties.length === 0 ? (
        <div style={{ background: '#0e0e0e', border: '1px solid rgba(77,70,55,0.25)', borderRadius: '0px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Raleway', sans-serif", fontSize: '14px', margin: '0 0 16px' }}>You have not listed any properties yet.</p>
          <Link
            href="/dashboard/properties/new"
            style={{
              color: '#c9a84c',
              textDecoration: 'none',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
            }}
          >
            Create your first listing &rarr;
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {properties.map((prop) => {
            const sc = statusColors[prop.status] || statusColors.inactive
            return (
              <Link
                key={prop.id}
                href={`/dashboard/properties/${prop.id}`}
                style={{
                  background: '#0e0e0e',
                  border: '1px solid rgba(77,70,55,0.25)',
                  borderRadius: '0px',
                  padding: '20px 24px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'border-color 0.3s ease',
                  flexWrap: 'wrap',
                }}
                className="property-list-item"
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h3 style={{ fontFamily: "'Raleway', sans-serif", fontSize: '15px', color: '#fff', margin: '0 0 6px', fontWeight: 600 }}>{prop.title}</h3>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{prop.property_type.replace('_', ' ')}</span>
                    <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>|</span>
                    <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{prop.city}</span>
                    <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>|</span>
                    <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#c9a84c' }}>{formatPrice(prop.price, prop.currency)}</span>
                  </div>
                  {prop.status === 'rejected' && prop.rejection_notes && (
                    <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#ef4444', margin: '8px 0 0', lineHeight: 1.5 }}>
                      Rejection reason: {prop.rejection_notes}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{
                    background: sc.bg,
                    color: sc.text,
                    padding: '4px 12px',
                    borderRadius: '0px',
                    fontSize: '11px',
                    fontFamily: "'Raleway', sans-serif",
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}>
                    {prop.status}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontFamily: "'Raleway', sans-serif" }}>
                    {new Date(prop.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <style>{`
        .property-list-item:hover {
          border-color: rgba(201,168,76,0.2) !important;
        }
      `}</style>
    </div>
  )
}
