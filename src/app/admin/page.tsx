'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

const GOLD = '#C9A84C'

function Spark({ data }: { data?: { date: string; count: number }[] }) {
  if (!data || data.length < 2) return null
  const w = 120, h = 22
  const max = Math.max(1, ...data.map((d) => d.count))
  const step = w / (data.length - 1)
  const pts = data.map((d, i) => `${i * step},${h - (d.count / max) * (h - 3) - 1.5}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '22px', opacity: 0.5 }}>
      <polyline points={pts} fill="none" stroke={GOLD} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

const STAGE_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', more_info_required: 'More info', approved: 'Approved', in_progress: 'In progress',
}

function fmtMoney(n?: number) {
  if (!n) return '0'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return String(n)
}

export default function AdminOverview() {
  const [s, setS] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/overview').then((r) => (r.ok ? r.json() : null)).then(setS).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '90px 0' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `2px solid rgba(201,168,76,0.12)`, borderTopColor: GOLD, animation: 'spin 0.8s linear infinite' }} />
        </div>
      </>
    )
  }
  if (!s) return <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Failed to load overview.</div>

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const attention = [
    s.pendingKYC > 0 && { n: s.pendingKYC, label: `KYC review${s.pendingKYC === 1 ? '' : 's'} awaiting`, href: '/admin/kyc', cta: 'Review' },
    s.unassignedEnquiries > 0 && { n: s.unassignedEnquiries, label: `unassigned enquir${s.unassignedEnquiries === 1 ? 'y' : 'ies'}`, href: '/admin/enquiries?status=submitted', cta: 'Assign' },
    s.tasksOverdue > 0 && { n: s.tasksOverdue, label: `overdue CRM task${s.tasksOverdue === 1 ? '' : 's'}`, href: '/admin/crm/tasks', cta: 'Open' },
  ].filter(Boolean)
  const attnTotal = attention.reduce((a, x) => a + x.n, 0)

  const kpis = [
    { label: 'Members', value: s.totalMembers, href: '/admin/users' },
    { label: 'Active leads', value: s.activeLeads ?? s.activeEnquiries, href: '/admin/crm/leads', spark: s.leadsSeries },
    { label: 'Open deals', value: s.openDeals ?? 0, href: '/admin/crm/deals' },
    { label: 'Weighted pipeline', value: fmtMoney(s.weightedPipelineValue), href: '/admin/crm/deals', accent: true },
    { label: 'Due today', value: s.tasksDueToday ?? 0, href: '/admin/crm/tasks', warn: (s.tasksDueToday ?? 0) > 0 },
    { label: 'Won · qtr', value: s.dealsWonThisQuarter ?? 0, href: '/admin/crm/deals?stage=closed_won' },
    { label: 'Conversion', value: `${s.conversionRate ?? 0}%`, href: '/admin/enquiries' },
    { label: 'New leads · 7d', value: s.newLeads7d ?? 0, href: '/admin/crm/leads' },
  ]

  const pipe = s.pipelineByStage || {}
  const pipeMax = Math.max(1, ...Object.values(pipe))

  const nav = [
    { t: 'Control Plane', href: '/admin/control-plane', icon: 'hub' },
    { t: 'CRM', href: '/admin/crm/dashboard', icon: 'crm' },
    { t: 'Recruitment', href: '/admin/recruitment', icon: 'people' },
    { t: 'Construction', href: '/admin/construction', icon: 'build' },
    { t: 'Trading', href: '/admin/trading', icon: 'ship' },
    { t: 'Risk Radar', href: '/admin/risk', icon: 'alert' },
    { t: 'AI', href: '/admin/ai', icon: 'spark' },
    { t: 'Enquiries', href: '/admin/enquiries', icon: 'msg' },
    { t: 'KYC Review', href: '/admin/kyc', icon: 'shield', count: s.pendingKYC },
    { t: 'Analytics', href: '/admin/analytics', icon: 'chart' },
  ]

  const icons: Record<string, JSX.Element> = {
    hub: <path d="M12 2v6m0 8v6M2 12h6m8 0h6M5.6 5.6l4.2 4.2m4.4 4.4l4.2 4.2m0-12.8l-4.2 4.2m-4.4 4.4l-4.2 4.2" />,
    crm: <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
    people: <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
    build: <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.8 2.8-2-2 2.8-2.8z" />,
    ship: <path d="M3 17l2-9h14l2 9M3 17a3 3 0 003 0 3 3 0 003 0 3 3 0 003 0 3 3 0 003 0 3 3 0 003 0M12 3v5M9 8h6" />,
    alert: <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h16.9a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4m0 4h.01" />,
    spark: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    msg: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
    chart: <path d="M18 20V10M12 20V4M6 20v-6" />,
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
        .aa { opacity: 0; animation: fadeIn .4s ease forwards; }
        .panel {
          background: #1b1a19;
          border: 1px solid rgba(201,168,76,.1);
          border-radius: 8px;
        }
        .kpi {
          background: #1b1a19;
          border: 1px solid rgba(201,168,76,.1);
          border-radius: 8px;
          padding: 13px 15px;
          text-decoration: none;
          display: block;
          position: relative;
          overflow: hidden;
          transition: border-color .2s, background .2s;
        }
        .kpi:hover { border-color: rgba(201,168,76,.28); background: #201f1d; }
        .num { font-family: 'Cinzel', serif; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
        .lbl { font-family: 'Raleway', sans-serif; font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: #d0c5b2; opacity: .5; }
        .tile {
          background: #1b1a19;
          border: 1px solid rgba(201,168,76,.09);
          border-radius: 8px;
          padding: 12px 13px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: border-color .2s, background .2s;
        }
        .tile:hover { border-color: rgba(201,168,76,.26); background: #201f1d; }
        @media (prefers-reduced-motion: reduce) { .aa { animation: none; opacity: 1; } }
      `}</style>

      <div>
        {/* header */}
        <div className="aa" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
          <div>
            <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '20px', color: '#ece9e6', margin: '0 0 3px', fontWeight: 500, letterSpacing: '1.5px' }}>Dashboard</h1>
            <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11.5px', color: '#d0c5b2', opacity: .42, margin: 0 }}>{dateStr} &middot; {timeStr}</p>
          </div>
          {attnTotal === 0 ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#7bd99a' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} /> All clear
            </span>
          ) : (
            <Link href={attention[0].href} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#e6c364', textDecoration: 'none' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: GOLD, animation: 'pulse 2s ease-in-out infinite' }} />
              {attnTotal} item{attnTotal === 1 ? '' : 's'} need attention
            </Link>
          )}
        </div>

        {/* KPI strip */}
        <div className="aa" style={{ animationDelay: '.05s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} className="kpi">
              <p className="num" style={{ fontSize: '21px', color: k.accent ? GOLD : k.warn ? '#e6c364' : '#ece9e6', margin: '0 0 5px' }}>{k.value}</p>
              <p className="lbl" style={{ margin: 0, position: 'relative', zIndex: 1 }}>{k.label}</p>
              {k.spark && <Spark data={k.spark} />}
            </Link>
          ))}
        </div>

        {/* attention list */}
        {attention.length > 0 && (
          <div className="aa panel" style={{ animationDelay: '.1s', marginBottom: '20px', overflow: 'hidden' }}>
            {attention.map((a, i) => (
              <Link key={i} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 15px', textDecoration: 'none', borderTop: i ? '1px solid rgba(201,168,76,.08)' : 'none' }}>
                <span className="num" style={{ fontSize: '15px', color: GOLD, minWidth: '20px', textAlign: 'center' }}>{a.n}</span>
                <span style={{ flex: 1, fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#e4e0da' }}>{a.label}</span>
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#e6c364', whiteSpace: 'nowrap' }}>{a.cta} &rarr;</span>
              </Link>
            ))}
          </div>
        )}

        {/* pipeline + 30-day */}
        <div className="aa" style={{ animationDelay: '.14s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '22px' }}>
          <div className="panel" style={{ padding: '15px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
              <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#d0c5b2', opacity: .6, margin: 0 }}>Opportunity pipeline</h2>
              <Link href="/admin/crm/pipeline" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: '#e6c364', textDecoration: 'none' }}>Open</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.keys(STAGE_LABEL).map((k) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
                  <span style={{ width: '72px', flexShrink: 0, fontFamily: "'Raleway', sans-serif", color: '#d0c5b2', opacity: .55 }}>{STAGE_LABEL[k]}</span>
                  <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${((pipe[k] || 0) / pipeMax) * 100}%`, background: GOLD, opacity: .8, borderRadius: '3px' }} />
                  </div>
                  <span className="num" style={{ width: '20px', textAlign: 'right', fontSize: '11px', color: '#d0c5b2', opacity: .8 }}>{pipe[k] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ padding: '15px 16px' }}>
            <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#d0c5b2', opacity: .6, margin: '0 0 12px' }}>Last 30 days</h2>
            <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap' }}>
              {[
                { n: s.mailInbound30d ?? 0, l: 'Emails in' },
                { n: s.mailOutbound30d ?? 0, l: 'Emails out' },
                { n: s.companies ?? 0, l: 'Companies' },
                { n: s.clients ?? 0, l: 'Clients' },
              ].map((x) => (
                <div key={x.l}>
                  <div className="num" style={{ fontSize: '18px', color: '#ece9e6' }}>{x.n}</div>
                  <div className="lbl" style={{ marginTop: '3px' }}>{x.l}</div>
                </div>
              ))}
            </div>
            <Link href="/admin/mail/dashboard" style={{ display: 'inline-block', marginTop: '14px', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: '#e6c364', textDecoration: 'none' }}>Mail dashboard &rarr;</Link>
          </div>
        </div>

        {/* modules */}
        <div className="aa" style={{ animationDelay: '.18s' }}>
          <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#d0c5b2', opacity: .6, margin: '0 0 10px' }}>Jump to</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '9px' }}>
            {nav.map((item) => (
              <Link key={item.t} href={item.href} className="tile">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: .85 }}>{icons[item.icon]}</svg>
                <span style={{ flex: 1, fontFamily: "'Raleway', sans-serif", fontSize: '12.5px', color: '#e4e0da' }}>{item.t}</span>
                {item.count > 0 && <span className="num" style={{ fontSize: '11px', color: '#e6c364' }}>{item.count}</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
