'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Deal {
  id: string
  title: string
  sector_tag: string | null
  status: string
  approval_status: string
  approval_notes: string | null
  created_at: string
  updated_at: string
}

const APPROVAL_BADGES: Record<string, { bg: string; color: string; label: string; glow: string }> = {
  pending_approval: { bg: 'rgba(234,179,8,0.12)', color: '#eab308', label: 'Pending Approval', glow: 'rgba(234,179,8,0.15)' },
  approved: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Approved', glow: 'rgba(34,197,94,0.15)' },
  rejected: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Rejected', glow: 'rgba(239,68,68,0.15)' },
}

const DRAFT_BADGE = { bg: 'rgba(163,163,163,0.12)', color: '#a3a3a3', label: 'Draft', glow: 'rgba(163,163,163,0.1)' }

export default function PartnerDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/partner/deals')
      if (!res.ok) throw new Error('Failed to load deals')
      const data = await res.json()
      setDeals(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totalDeals = deals.length
  const pendingDeals = deals.filter(d => d.approval_status === 'pending_approval')
  const approvedDeals = deals.filter(d => d.approval_status === 'approved')
  const rejectedDeals = deals.filter(d => d.approval_status === 'rejected')

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '2px solid rgba(201,168,76,0.1)',
            borderTopColor: '#C9A84C',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes badgeGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(201,168,76,0.2); }
          50% { box-shadow: 0 0 14px rgba(201,168,76,0.4); }
        }
        .partner-animate { opacity: 0; animation: fadeInUp 0.6s ease forwards; }
        .partner-animate-1 { animation-delay: 0.1s; }
        .partner-animate-2 { animation-delay: 0.2s; }
        .partner-animate-3 { animation-delay: 0.3s; }
        .partner-animate-4 { animation-delay: 0.4s; }
        .partner-animate-5 { animation-delay: 0.5s; }
        .partner-stat-card {
          background: rgba(8,8,8,0.6);
          border: 1px solid rgba(201,168,76,0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 0;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .partner-stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.12), transparent);
        }
        .partner-stat-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(201,168,76,0.02) 0%, transparent 50%);
          pointer-events: none;
        }
        .partner-stat-card:hover {
          border-color: rgba(201,168,76,0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .partner-deal-card {
          display: block;
          background: rgba(8,8,8,0.6);
          border: 1px solid rgba(201,168,76,0.06);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 0;
          padding: 24px;
          text-decoration: none;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .partner-deal-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent);
        }
        .partner-deal-card:hover {
          border-color: rgba(201,168,76,0.2);
          box-shadow: 0 0 20px rgba(201,168,76,0.06);
          transform: translateY(-2px);
        }
        .partner-bg-pattern {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(201,168,76,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.015) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
        }
        .partner-submit-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #8a6f2e 0%, #C9A84C 50%, #8a6f2e 100%);
          color: #000;
          font-family: 'Raleway', sans-serif;
          font-weight: 600;
          font-size: 13px;
          padding: 12px 24px;
          border-radius: 0;
          text-decoration: none;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          letter-spacing: 0.5px;
        }
        .partner-submit-btn:hover {
          box-shadow: 0 0 24px rgba(201,168,76,0.25);
          transform: translateY(-1px);
        }
      `}</style>

      <div className="partner-bg-pattern" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="partner-animate partner-animate-1" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '36px', flexWrap: 'wrap', gap: '16px',
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '28px',
              color: '#fff',
              margin: '0 0 6px',
              fontWeight: 500,
              letterSpacing: '2px',
            }}>
              Partner Portal
            </h1>
            <p style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
              color: 'rgba(255,255,255,0.35)',
              margin: 0,
            }}>
              Manage your investment deals
            </p>
          </div>
          <Link href="/partner/submit" className="partner-submit-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#000" strokeWidth="2"/>
              <path d="M12 8v8m-4-4h8" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Submit New Deal
          </Link>
        </div>

        {/* Stats Row */}
        <div className="partner-animate partner-animate-2" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '36px',
        }}>
          <div className="partner-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.35 }}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke="#C9A84C" strokeWidth="1.5"/>
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ marginTop: '16px', position: 'relative', zIndex: 1 }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '32px', color: '#C9A84C', margin: '0 0 6px', fontWeight: 600, lineHeight: 1 }}>{totalDeals}</p>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Total Deals</p>
            </div>
          </div>
          <div className="partner-stat-card" style={{ borderColor: pendingDeals.length > 0 ? 'rgba(234,179,8,0.15)' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.35 }}>
                <circle cx="12" cy="12" r="10" stroke="#eab308" strokeWidth="1.5"/>
                <path d="M12 6v6l4 2" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ marginTop: '16px', position: 'relative', zIndex: 1 }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '32px', color: '#eab308', margin: '0 0 6px', fontWeight: 600, lineHeight: 1 }}>{pendingDeals.length}</p>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Pending Approval</p>
            </div>
          </div>
          <div className="partner-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.35 }}>
                <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="1.5"/>
                <path d="M8 12l3 3 5-5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ marginTop: '16px', position: 'relative', zIndex: 1 }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '32px', color: '#22c55e', margin: '0 0 6px', fontWeight: 600, lineHeight: 1 }}>{approvedDeals.length}</p>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Approved</p>
            </div>
          </div>
          <div className="partner-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.35 }}>
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.5"/>
                <path d="M15 9l-6 6M9 9l6 6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ marginTop: '16px', position: 'relative', zIndex: 1 }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '32px', color: '#ef4444', margin: '0 0 6px', fontWeight: 600, lineHeight: 1 }}>{rejectedDeals.length}</p>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Rejected</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="partner-animate partner-animate-3" style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderLeft: '3px solid #ef4444',
            borderRadius: 0,
            padding: '14px 20px',
            marginBottom: '24px',
          }}>
            <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#ef4444', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Deals Section */}
        <div className="partner-animate partner-animate-3">
          <h2 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '18px',
            color: '#fff',
            letterSpacing: '1px',
            margin: '0 0 20px',
          }}>
            Your Deals
          </h2>

          {deals.length === 0 ? (
            <div style={{
              background: 'rgba(8,8,8,0.6)',
              border: '1px solid rgba(201,168,76,0.06)',
              borderRadius: 0,
              padding: '64px 20px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px', opacity: 0.2 }}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke="#C9A84C" strokeWidth="1.5"/>
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p style={{ fontFamily: "'Raleway', sans-serif", color: 'rgba(255,255,255,0.35)', fontSize: '14px', margin: '0 0 20px' }}>
                You haven&apos;t submitted any deals yet. Click &quot;Submit New Deal&quot; to get started.
              </p>
              <Link href="/partner/submit" className="partner-submit-btn">
                Submit Your First Deal
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deals.map((deal, idx) => {
                const badge = deal.approval_status
                  ? (APPROVAL_BADGES[deal.approval_status] || DRAFT_BADGE)
                  : DRAFT_BADGE

                return (
                  <Link
                    key={deal.id}
                    href={`/partner/${deal.id}`}
                    className="partner-deal-card"
                    style={{ animationDelay: `${0.4 + idx * 0.08}s` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <h3 style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: '16px',
                        color: '#fff',
                        margin: 0,
                        fontWeight: 500,
                      }}>{deal.title}</h3>
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                        padding: '5px 14px',
                        borderRadius: 0,
                        background: badge.bg,
                        color: badge.color,
                        boxShadow: `0 0 12px ${badge.glow}`,
                      }}>{badge.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      {deal.sector_tag && (
                        <span style={{
                          fontFamily: "'Raleway', sans-serif",
                          fontSize: '12px',
                          color: '#C9A84C',
                          background: 'rgba(201,168,76,0.1)',
                          padding: '3px 10px',
                          borderRadius: 0,
                          border: '1px solid rgba(201,168,76,0.1)',
                        }}>{deal.sector_tag}</span>
                      )}
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.25)',
                      }}>
                        Created {new Date(deal.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {deal.approval_status === 'rejected' && deal.approval_notes && (
                      <div style={{
                        marginTop: '14px',
                        padding: '10px 14px',
                        background: 'rgba(239,68,68,0.06)',
                        borderRadius: 0,
                        borderLeft: '3px solid rgba(239,68,68,0.4)',
                      }}>
                        <p style={{
                          fontFamily: "'Raleway', sans-serif",
                          fontSize: '12px',
                          color: 'rgba(239,68,68,0.8)',
                          margin: 0,
                        }}>Rejection note: {deal.approval_notes}</p>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
