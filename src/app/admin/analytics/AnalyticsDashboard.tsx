'use client'
// @ts-nocheck

import { useState, useEffect } from 'react'

interface AnalyticsData {
  totalMembers: number
  newThisMonth: number
  totalEnquiries: number
  activeEnquiries: number
  pipelineValue: number
  memberGrowth: { month: string; count: number }[]
  enquiryTrends: { month: string; count: number }[]
  enquiriesByStatus: Record<string, number>
  topSectors: { sector: string; count: number }[]
  investmentPipeline: Record<string, { count: number; value: number }>
  activeChats: number
  kyc: { pending: number; approved: number; rejected: number }
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val}`
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`
}

const STATUS_COLORS: Record<string, string> = {
  submitted: '#C9A84C',
  assigned: '#6B8AE0',
  active: '#4CAF50',
  waiting: '#FF9800',
  resolved: '#9E9E9E',
  closed: '#666',
  draft: '#444',
  open: '#4CAF50',
  funded: '#4CAF50',
  pending: '#FF9800',
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/analytics')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    load()
  }, [])

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

  if (!data) {
    return (
      <div style={{
        padding: '80px 20px', textAlign: 'center',
        fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.4)',
      }}>
        Failed to load analytics data.
      </div>
    )
  }

  const maxMemberGrowth = Math.max(...data.memberGrowth.map(m => m.count), 1)
  const maxEnquiryTrend = Math.max(...data.enquiryTrends.map(m => m.count), 1)
  const totalStatusEnquiries = Object.values(data.enquiriesByStatus).reduce((a, b) => a + b, 0) || 1
  const maxSectorCount = data.topSectors.length > 0 ? Math.max(...data.topSectors.map(s => s.count), 1) : 1

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes donutGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(201,168,76,0.1); }
          50% { box-shadow: 0 0 40px rgba(201,168,76,0.2); }
        }
        @keyframes barGrow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .analytics-animate { opacity: 0; animation: fadeInUp 0.6s ease forwards; }
        .analytics-animate-1 { animation-delay: 0.1s; }
        .analytics-animate-2 { animation-delay: 0.2s; }
        .analytics-animate-3 { animation-delay: 0.3s; }
        .analytics-animate-4 { animation-delay: 0.4s; }
        .analytics-animate-5 { animation-delay: 0.5s; }
        .analytics-stat-card {
          background: rgba(8,8,8,0.6);
          border: 1px solid rgba(201,168,76,0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .analytics-stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.12), transparent);
        }
        .analytics-stat-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(201,168,76,0.02) 0%, transparent 50%);
          pointer-events: none;
        }
        .analytics-stat-card:hover {
          border-color: rgba(201,168,76,0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .analytics-chart-card {
          background: rgba(8,8,8,0.6);
          border: 1px solid rgba(201,168,76,0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 28px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .analytics-chart-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.1), transparent);
        }
        .analytics-chart-card:hover {
          border-color: rgba(201,168,76,0.15);
        }
        .analytics-bar {
          transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: bottom;
          border-radius: 6px 6px 0 0;
          position: relative;
        }
        .analytics-bar:hover {
          filter: brightness(1.2);
        }
        .analytics-bar::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 6px 6px 0 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 50%);
          pointer-events: none;
        }
        .analytics-grid-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 100% 25%;
        }
        .analytics-bg-pattern {
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
        .analytics-pipeline-card {
          background: rgba(8,8,8,0.6);
          border: 1px solid rgba(201,168,76,0.06);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 10px;
          padding: 20px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .analytics-pipeline-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent);
        }
        .analytics-pipeline-card:hover {
          border-color: rgba(201,168,76,0.15);
          transform: translateY(-1px);
        }
      `}</style>

      <div className="analytics-bg-pattern" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="analytics-animate analytics-animate-1" style={{ marginBottom: '36px' }}>
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '28px',
            fontWeight: 500,
            color: '#fff',
            letterSpacing: '4px',
            margin: '0 0 8px',
          }}>ANALYTICS</h1>
          <p style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            color: 'rgba(255,255,255,0.35)',
            margin: 0,
          }}>Platform performance overview</p>
        </div>

        {/* Overview Cards */}
        <div className="analytics-animate analytics-animate-2" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
          marginBottom: '32px',
        }}>
          {[
            { label: 'Total Members', value: String(data.totalMembers), color: '#C9A84C' },
            { label: 'New This Month', value: String(data.newThisMonth), color: '#C9A84C' },
            { label: 'Total Enquiries', value: String(data.totalEnquiries), color: '#C9A84C' },
            { label: 'Active Enquiries', value: String(data.activeEnquiries), color: '#C9A84C' },
            { label: 'Pipeline Value', value: formatCurrency(data.pipelineValue), color: '#E2C97E' },
            { label: 'Active Chats (7d)', value: String(data.activeChats), color: '#C9A84C' },
            { label: 'KYC Pending', value: String(data.kyc.pending), color: data.kyc.pending > 0 ? '#eab308' : '#C9A84C' },
          ].map((stat) => (
            <div key={stat.label} className="analytics-stat-card">
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '10px',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)',
                  marginBottom: '10px',
                }}>{stat.label}</div>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '28px',
                  color: stat.color,
                  fontWeight: 600,
                  lineHeight: 1,
                }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Member Growth Bar Chart */}
          <div className="analytics-chart-card analytics-animate analytics-animate-3">
            <h3 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '2px',
              margin: 0,
              textTransform: 'uppercase',
            }}>Member Growth</h3>
            <p style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
              marginTop: '4px',
              marginBottom: 0,
            }}>New members per month (last 6 months)</p>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '10px', height: '200px', marginTop: '24px', padding: '0 8px' }}>
              <div className="analytics-grid-bg" />
              {data.memberGrowth.map((m, i) => (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
                  <span style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '12px',
                    color: '#C9A84C',
                    marginBottom: '6px',
                    fontWeight: 600,
                  }}>{m.count}</span>
                  <div
                    className="analytics-bar"
                    style={{
                      width: '100%',
                      maxWidth: '52px',
                      height: `${Math.max((m.count / maxMemberGrowth) * 150, 6)}px`,
                      background: `linear-gradient(180deg, #E2C97E 0%, #C9A84C 40%, #8a6f2e 100%)`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                  <span style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.3)',
                    marginTop: '10px',
                  }}>
                    {monthLabel(m.month)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Enquiry Trends Bar Chart */}
          <div className="analytics-chart-card analytics-animate analytics-animate-3">
            <h3 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '2px',
              margin: 0,
              textTransform: 'uppercase',
            }}>Enquiry Trends</h3>
            <p style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
              marginTop: '4px',
              marginBottom: 0,
            }}>New enquiries per month (last 6 months)</p>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '10px', height: '200px', marginTop: '24px', padding: '0 8px' }}>
              <div className="analytics-grid-bg" />
              {data.enquiryTrends.map((m, i) => (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
                  <span style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '12px',
                    color: '#C9A84C',
                    marginBottom: '6px',
                    fontWeight: 600,
                  }}>{m.count}</span>
                  <div
                    className="analytics-bar"
                    style={{
                      width: '100%',
                      maxWidth: '52px',
                      height: `${Math.max((m.count / maxEnquiryTrend) * 150, 6)}px`,
                      background: `linear-gradient(180deg, #f0d78e 0%, #E2C97E 30%, #C9A84C 60%, #8a6f2e 100%)`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                  <span style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.3)',
                    marginTop: '10px',
                  }}>
                    {monthLabel(m.month)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Enquiry Status Donut */}
          <div className="analytics-chart-card analytics-animate analytics-animate-4">
            <h3 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '2px',
              margin: 0,
              textTransform: 'uppercase',
            }}>Enquiries by Status</h3>
            <p style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
              marginTop: '4px',
              marginBottom: 0,
            }}>Current distribution across statuses</p>
            <div style={{ display: 'flex', gap: '32px', marginTop: '24px', alignItems: 'center' }}>
              <DonutChart data={data.enquiriesByStatus} total={totalStatusEnquiries} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(data.enquiriesByStatus).map(([status, count]) => (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: 0,
                      background: STATUS_COLORS[status] || '#666',
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${STATUS_COLORS[status] || '#666'}40`,
                    }} />
                    <span style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      textTransform: 'capitalize',
                    }}>
                      {status}
                    </span>
                    <span style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.35)',
                      fontWeight: 600,
                    }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Sectors Horizontal Bar */}
          <div className="analytics-chart-card analytics-animate analytics-animate-4">
            <h3 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '2px',
              margin: 0,
              textTransform: 'uppercase',
            }}>Top Sectors</h3>
            <p style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
              marginTop: '4px',
              marginBottom: 0,
            }}>Most active enquiry sectors</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              {data.topSectors.length === 0 ? (
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No sector data</span>
              ) : (
                data.topSectors.map(s => (
                  <div key={s.sector} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      width: '120px',
                      flexShrink: 0,
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}>{s.sector}</span>
                    <div style={{
                      flex: 1,
                      height: '24px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 0,
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      <div style={{
                        width: `${(s.count / maxSectorCount) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #8a6f2e, #C9A84C, #E2C97E)',
                        borderRadius: 0,
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                      }}>
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 0,
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                        }} />
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '12px',
                      color: '#C9A84C',
                      width: '30px',
                      textAlign: 'right',
                      fontWeight: 600,
                    }}>{s.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Investment Pipeline */}
          <div className="analytics-chart-card analytics-animate analytics-animate-5" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '2px',
              margin: 0,
              textTransform: 'uppercase',
            }}>Investment Pipeline</h3>
            <p style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
              marginTop: '4px',
              marginBottom: 0,
            }}>Deals by status with total values</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
              {Object.keys(data.investmentPipeline).length === 0 ? (
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No investment data</span>
              ) : (
                Object.entries(data.investmentPipeline).map(([status, info]) => (
                  <div key={status} className="analytics-pipeline-card">
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '10px',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.35)',
                        marginBottom: '10px',
                      }}>{status}</div>
                      <div style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: '28px',
                        color: '#C9A84C',
                        fontWeight: 600,
                        lineHeight: 1,
                      }}>{info.count}</div>
                      <div style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.4)',
                        marginTop: '6px',
                      }}>{formatCurrency(info.value)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* KYC Stats */}
          <div className="analytics-chart-card analytics-animate analytics-animate-5" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '2px',
              margin: 0,
              textTransform: 'uppercase',
            }}>KYC Overview</h3>
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
              <KycCard label="Pending" count={data.kyc.pending} color="#FF9800" />
              <KycCard label="Approved" count={data.kyc.approved} color="#4CAF50" />
              <KycCard label="Rejected" count={data.kyc.rejected} color="#f44336" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// --- Sub-components ---

function KycCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{
      flex: 1,
      background: 'rgba(8,8,8,0.6)',
      border: '1px solid rgba(201,168,76,0.06)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: 0,
      padding: '24px',
      borderTop: `3px solid ${color}`,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40px',
        background: `linear-gradient(180deg, ${color}08, transparent)`,
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize: '10px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
          marginBottom: '10px',
        }}>{label}</div>
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '32px',
          color,
          fontWeight: 600,
          lineHeight: 1,
        }}>{count}</div>
      </div>
    </div>
  )
}

function DonutChart({ data, total }: { data: Record<string, number>; total: number }) {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return (
      <div style={{
        width: '160px',
        height: '160px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>No data</span>
      </div>
    )
  }

  // Build conic-gradient
  const gradientParts: string[] = []
  let cumulative = 0
  for (const [status, count] of entries) {
    const start = (cumulative / total) * 360
    cumulative += count
    const end = (cumulative / total) * 360
    const color = STATUS_COLORS[status] || '#666'
    gradientParts.push(`${color} ${start}deg ${end}deg`)
  }

  return (
    <div style={{
      width: '160px',
      height: '160px',
      borderRadius: '50%',
      background: `conic-gradient(${gradientParts.join(', ')})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 0 30px rgba(201,168,76,0.08)',
      animation: 'donutGlow 4s ease-in-out infinite',
    }}>
      <div style={{
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #0d0d0d, #080808)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
      }}>
        <span style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '24px',
          color: '#C9A84C',
          fontWeight: 600,
          lineHeight: 1,
          textShadow: '0 0 10px rgba(201,168,76,0.3)',
        }}>
          {total}
        </span>
        <span style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize: '9px',
          color: 'rgba(255,255,255,0.3)',
          marginTop: '3px',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          total
        </span>
      </div>
    </div>
  )
}
