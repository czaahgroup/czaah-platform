'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'


interface Stats {
  totalMembers: number
  pendingKYC: number
  totalEnquiries: number
  unassignedEnquiries: number
  activeEnquiries: number
  totalAdmins: number
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/overview')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
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

  if (!stats) {
    return (
      <div style={{
        textAlign: 'center', padding: '80px 20px',
        fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.4)',
      }}>
        Failed to load overview.
      </div>
    )
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const pendingActions = stats.pendingKYC + stats.unassignedEnquiries

  const cards = [
    { label: 'Total Members', value: stats.totalMembers, icon: 'members', alert: false, trend: 'up' as const },
    { label: 'Pending KYC', value: stats.pendingKYC, icon: 'kyc', alert: stats.pendingKYC > 0, trend: null },
    { label: 'Total Enquiries', value: stats.totalEnquiries, icon: 'enquiries', alert: false, trend: 'up' as const },
    { label: 'Unassigned', value: stats.unassignedEnquiries, icon: 'unassigned', alert: stats.unassignedEnquiries > 0, trend: null },
    { label: 'Active Enquiries', value: stats.activeEnquiries, icon: 'active', alert: false, trend: null },
    { label: 'Admins', value: stats.totalAdmins, icon: 'admins', alert: false, trend: null },
  ]

  const quickAccess = [
    { title: 'KYC Review', href: '/admin/kyc', count: stats.pendingKYC, icon: 'shield' },
    { title: 'Enquiries', href: '/admin/enquiries', count: stats.totalEnquiries, icon: 'message' },
    { title: 'Elite Chats', href: '/admin/chats', count: null, icon: 'chat' },
    { title: 'Contacts', href: '/admin/contacts', count: null, icon: 'users' },
    { title: 'Investments', href: '/admin/investments', count: null, icon: 'briefcase' },
    { title: 'Analytics', href: '/admin/analytics', count: null, icon: 'chart' },
  ]

  const iconMap: Record<string, JSX.Element> = {
    members: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#C9A84C" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    kyc: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    enquiries: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    unassigned: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#C9A84C" strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    active: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    admins: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#C9A84C" strokeWidth="1.5"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#C9A84C" strokeWidth="1.5"/></svg>,
    shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    message: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    chat: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#C9A84C" strokeWidth="1.5"/></svg>,
    briefcase: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke="#C9A84C" strokeWidth="1.5"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    chart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 20V10M12 20V4M6 20v-6" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes goldPulse {
          0%, 100% { border-color: rgba(201,168,76,0.15); box-shadow: 0 0 0 rgba(201,168,76,0); }
          50% { border-color: rgba(201,168,76,0.35); box-shadow: 0 0 20px rgba(201,168,76,0.08); }
        }
        @keyframes alertPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .admin-animate { opacity: 0; animation: fadeInUp 0.6s ease forwards; }
        .admin-animate-1 { animation-delay: 0.1s; }
        .admin-animate-2 { animation-delay: 0.2s; }
        .admin-animate-3 { animation-delay: 0.3s; }
        .admin-animate-4 { animation-delay: 0.4s; }
        .admin-animate-5 { animation-delay: 0.5s; }
        .admin-stat-card {
          background: #1c1b1b;
          border: 1px solid rgba(77,70,55,0.15);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 0;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.12), transparent);
        }
        .admin-stat-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(201,168,76,0.02) 0%, transparent 50%);
          pointer-events: none;
        }
        .admin-stat-card:hover {
          border-color: rgba(201,168,76,0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(201,168,76,0.08);
        }
        .admin-stat-alert {
          animation: goldPulse 2.5s ease-in-out infinite;
        }
        .admin-alert-banner {
          background: #1c1b1b;
          border: 1px solid rgba(201,168,76,0.12);
          border-left: 3px solid #C9A84C;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 0;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.3s ease;
        }
        .admin-alert-banner:hover {
          border-color: rgba(201,168,76,0.25);
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .admin-quick-card {
          background: #1c1b1b;
          border: 1px solid rgba(77,70,55,0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 0;
          padding: 20px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .admin-quick-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent);
        }
        .admin-quick-card:hover {
          border-color: rgba(201,168,76,0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 20px rgba(201,168,76,0.05);
        }
        .admin-bg-pattern {
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
      `}</style>

      <div className="admin-bg-pattern" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="admin-animate admin-animate-1" style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '28px',
                color: '#e5e2e1',
                margin: '0 0 6px',
                fontWeight: 500,
                letterSpacing: '2px',
              }}>
                Dashboard
              </h1>
              <p style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '13px',
                color: '#d0c5b2', opacity: 0.5,
                margin: 0,
              }}>
                {dateStr} &middot; {timeStr}
              </p>
            </div>
            {pendingActions > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: 0,
                padding: '8px 16px',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#C9A84C',
                  animation: 'alertPulse 2s ease-in-out infinite',
                }} />
                <span style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '13px',
                  color: '#e6c364',
                }}>
                  {pendingActions} pending action{pendingActions !== 1 ? 's' : ''} require your attention
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="admin-animate admin-animate-2" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {cards.map((stat, idx) => (
            <div
              key={stat.label}
              className={`admin-stat-card ${stat.alert ? 'admin-stat-alert' : ''}`}
              style={{ animationDelay: `${0.15 + idx * 0.05}s` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div style={{ opacity: 0.4 }}>
                  {iconMap[stat.icon]}
                </div>
                {stat.trend === 'up' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
                    <path d="M7 17l5-5 4 4 6-6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 7h5v5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{ marginTop: '16px', position: 'relative', zIndex: 1 }}>
                <p style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '32px',
                  color: stat.alert ? '#e6c364' : '#e5e2e1',
                  margin: '0 0 6px',
                  fontWeight: 600,
                  lineHeight: 1,
                }}>
                  {stat.value}
                </p>
                <p style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '10px',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: '#d0c5b2', opacity: 0.5,
                  margin: 0,
                }}>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Alert Banners */}
        {(stats.pendingKYC > 0 || stats.unassignedEnquiries > 0) && (
          <div className="admin-animate admin-animate-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {stats.pendingKYC > 0 && (
              <div className="admin-alert-banner">
                <div style={{
                  width: '36px', height: '36px', borderRadius: 0,
                  background: 'rgba(201,168,76,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {iconMap.shield}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '14px',
                    color: '#fff',
                    margin: '0 0 2px',
                  }}>
                    <strong style={{ color: '#C9A84C' }}>{stats.pendingKYC}</strong> KYC application{stats.pendingKYC !== 1 ? 's' : ''} awaiting review
                  </p>
                  <p style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.3)',
                    margin: 0,
                  }}>
                    Members are waiting for identity verification
                  </p>
                </div>
                <Link href="/admin/kyc" style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '13px',
                  color: '#e6c364',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                }}>
                  Review Now &rarr;
                </Link>
              </div>
            )}
            {stats.unassignedEnquiries > 0 && (
              <div className="admin-alert-banner">
                <div style={{
                  width: '36px', height: '36px', borderRadius: 0,
                  background: 'rgba(201,168,76,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {iconMap.message}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '14px',
                    color: '#fff',
                    margin: '0 0 2px',
                  }}>
                    <strong style={{ color: '#C9A84C' }}>{stats.unassignedEnquiries}</strong> unassigned enquir{stats.unassignedEnquiries !== 1 ? 'ies' : 'y'}
                  </p>
                  <p style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.3)',
                    margin: 0,
                  }}>
                    Enquiries need to be assigned to an admin
                  </p>
                </div>
                <Link href="/admin/enquiries" style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '13px',
                  color: '#e6c364',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                }}>
                  Assign Now &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Quick Access Grid */}
        <div className="admin-animate admin-animate-4">
          <h2 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '18px',
            color: '#fff',
            letterSpacing: '1px',
            margin: '0 0 20px',
          }}>
            Quick Access
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}>
            {quickAccess.map((item) => (
              <Link key={item.title} href={item.href} className="admin-quick-card">
                <div style={{
                  width: '40px', height: '40px', borderRadius: 0,
                  background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {iconMap[item.icon]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '14px',
                    color: '#fff',
                    marginBottom: '2px',
                  }}>
                    {item.title}
                  </div>
                </div>
                {item.count !== null && item.count > 0 && (
                  <span style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#e6c364',
                    background: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.15)',
                    padding: '2px 10px',
                    borderRadius: 0,
                    minWidth: '28px',
                    textAlign: 'center',
                  }}>
                    {item.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
