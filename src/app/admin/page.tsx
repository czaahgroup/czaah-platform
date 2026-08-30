'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'

const GOLD = '#C9A84C'

function Spark({ data }: { data?: { date: string; count: number }[] }) {
  if (!data || data.length < 2) return null
  const w = 132, h = 34
  const max = Math.max(1, ...data.map((d) => d.count))
  const step = w / (data.length - 1)
  const pts = data.map((d, i) => `${i * step},${h - (d.count / max) * (h - 6) - 3}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.28" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#sparkFill)" />
      <polyline points={pts} fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={w} cy={h - (data[data.length - 1].count / max) * (h - 6) - 3} r="2.4" fill={GOLD} />
    </svg>
  )
}

const STAGE_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', more_info_required: 'More info', approved: 'Approved', in_progress: 'In progress',
}

function fmtMoney(n?: number) {
  if (!n) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return String(n)
}

export default function AdminOverview() {
  const [s, setS] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((r) => (r.ok ? r.json() : null))
      .then(setS)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '90px 0' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2px solid rgba(201,168,76,0.12)`, borderTopColor: GOLD, animation: 'spin 0.8s linear infinite' }} />
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

  // headline KPIs — the weighted-pipeline card gets the gradient treatment
  const kpis = [
    { label: 'Members', value: s.totalMembers, href: '/admin/users' },
    { label: 'Active leads', value: s.activeLeads ?? s.activeEnquiries, href: '/admin/crm/leads', spark: s.leadsSeries },
    { label: 'Open deals', value: s.openDeals ?? 0, href: '/admin/crm/deals' },
    { label: 'Weighted pipeline', value: fmtMoney(s.weightedPipelineValue), href: '/admin/crm/deals', hero: true },
    { label: 'Tasks due today', value: s.tasksDueToday ?? 0, href: '/admin/crm/tasks', warn: (s.tasksDueToday ?? 0) > 0 },
    { label: 'Conversion', value: `${s.conversionRate ?? 0}%`, href: '/admin/enquiries' },
  ]

  const pipe = s.pipelineByStage || {}
  const pipeMax = Math.max(1, ...Object.values(pipe))

  const nav = [
    { t: 'Control Plane', d: 'Cross-module snapshot', href: '/admin/control-plane', icon: 'hub' },
    { t: 'CRM', d: 'Contacts, companies, deals', href: '/admin/crm/dashboard', icon: 'crm' },
    { t: 'Recruitment', d: 'Job orders & placements', href: '/admin/recruitment', icon: 'people' },
    { t: 'Construction', d: 'Projects & milestones', href: '/admin/construction', icon: 'build' },
    { t: 'Trading', d: 'Commodity desk', href: '/admin/trading', icon: 'ship' },
    { t: 'Risk Radar', d: 'What needs attention', href: '/admin/risk', icon: 'alert' },
    { t: 'AI', d: 'Briefings & assistant', href: '/admin/ai', icon: 'spark' },
    { t: 'KYC Review', d: 'Verify members', href: '/admin/kyc', icon: 'shield', count: s.pendingKYC },
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
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        .aa { opacity: 0; animation: fadeInUp .55s cubic-bezier(.4,0,.2,1) forwards; }
        .card {
          background: linear-gradient(160deg, #201f1e, #1a1918);
          border: 1px solid rgba(201,168,76,.12);
          border-radius: 12px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: transform .35s cubic-bezier(.4,0,.2,1), border-color .35s, box-shadow .35s;
        }
        .card::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(120% 80% at 100% 0%, rgba(201,168,76,.06), transparent 60%);
        }
        .card:hover { transform: translateY(-3px); border-color: rgba(201,168,76,.3); box-shadow: 0 12px 40px rgba(0,0,0,.35), 0 0 24px rgba(201,168,76,.08); }
        .card.hero { border-color: rgba(201,168,76,.3); box-shadow: inset 0 0 40px rgba(201,168,76,.05); }
        .num { font-family: 'Cinzel', serif; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
        .grad { background: linear-gradient(120deg, #f2d898, #C9A84C); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .lbl { font-family: 'Raleway', sans-serif; font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; color: #d0c5b2; opacity: .5; }
        .bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: linear-gradient(rgba(201,168,76,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,.02) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 90% 60% at 50% 0%, #000 20%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse 90% 60% at 50% 0%, #000 20%, transparent 75%);
        }
        @media (prefers-reduced-motion: reduce) { .aa { animation: none; opacity: 1; } .card { transition: none; } }
      `}</style>

      <div className="bg" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* header */}
        <div className="aa" style={{ animationDelay: '.05s', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '26px', color: '#ece9e6', margin: '0 0 5px', fontWeight: 500, letterSpacing: '2px' }}>Dashboard</h1>
            <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#d0c5b2', opacity: .45, margin: 0 }}>{dateStr} &middot; {timeStr}</p>
          </div>
          {attention.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '999px', padding: '7px 15px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12.5px', color: '#7bd99a' }}>All clear</span>
            </div>
          ) : (
            <Link href={attention[0].href} style={{ display: 'flex', alignItems: 'center', gap: '9px', background: 'rgba(201,168,76,.09)', border: '1px solid rgba(201,168,76,.22)', borderRadius: '999px', padding: '7px 15px', textDecoration: 'none' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: GOLD, animation: 'pulse 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12.5px', color: '#e6c364' }}>
                {attention.reduce((a, x) => a + x.n, 0)} item{attention.reduce((a, x) => a + x.n, 0) === 1 ? '' : 's'} need attention
              </span>
            </Link>
          )}
        </div>

        {/* KPI grid */}
        <div className="aa" style={{ animationDelay: '.12s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(184px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} className={`card ${k.hero ? 'hero' : ''}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p className={`num ${k.hero ? 'grad' : ''}`} style={{ fontSize: k.hero ? '30px' : '32px', color: k.hero ? undefined : k.warn ? '#e6c364' : '#ece9e6', margin: '0 0 7px' }}>{k.value}</p>
                <p className="lbl" style={{ margin: 0 }}>{k.label}</p>
                {k.spark && <div style={{ marginTop: '12px', opacity: .9 }}><Spark data={k.spark} /></div>}
              </div>
            </Link>
          ))}
        </div>

        {/* attention rows */}
        {attention.length > 0 && (
          <div className="aa" style={{ animationDelay: '.2s', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
            {attention.map((a, i) => (
              <Link key={i} href={a.href} className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderLeft: `2px solid ${GOLD}` }}>
                <span className="num grad" style={{ fontSize: '20px', minWidth: '26px', textAlign: 'center' }}>{a.n}</span>
                <span style={{ flex: 1, fontFamily: "'Raleway', sans-serif", fontSize: '13.5px', color: '#e9e5df' }}>{a.label}</span>
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12.5px', color: '#e6c364', whiteSpace: 'nowrap' }}>{a.cta} &rarr;</span>
              </Link>
            ))}
          </div>
        )}

        {/* pipeline + mail */}
        <div className="aa" style={{ animationDelay: '.26s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '30px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', color: '#fff', letterSpacing: '1px', margin: 0 }}>Opportunity pipeline</h2>
              <Link href="/admin/crm/pipeline" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: '#e6c364', textDecoration: 'none' }}>Open &rarr;</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {Object.keys(STAGE_LABEL).map((k) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
                  <span style={{ width: '74px', flexShrink: 0, fontFamily: "'Raleway', sans-serif", color: '#d0c5b2', opacity: .6 }}>{STAGE_LABEL[k]}</span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${((pipe[k] || 0) / pipeMax) * 100}%`, background: `linear-gradient(90deg, rgba(201,168,76,.5), ${GOLD})`, borderRadius: '4px' }} />
                  </div>
                  <span className="num" style={{ width: '22px', textAlign: 'right', fontSize: '12px', color: '#d0c5b2', opacity: .8 }}>{pipe[k] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', color: '#fff', letterSpacing: '1px', margin: '0 0 14px' }}>Last 30 days</h2>
            <div style={{ display: 'flex', gap: '26px', flexWrap: 'wrap' }}>
              {[
                { n: s.mailInbound30d ?? 0, l: 'Emails in' },
                { n: s.mailOutbound30d ?? 0, l: 'Emails out' },
                { n: s.newLeads7d ?? 0, l: 'New leads · 7d' },
                { n: s.dealsWonThisQuarter ?? 0, l: 'Deals won · qtr' },
              ].map((x) => (
                <div key={x.l}>
                  <div className="num" style={{ fontSize: '22px', color: '#ece9e6' }}>{x.n}</div>
                  <div className="lbl" style={{ marginTop: '3px' }}>{x.l}</div>
                </div>
              ))}
            </div>
            <Link href="/admin/mail/dashboard" style={{ display: 'inline-block', marginTop: '16px', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: '#e6c364', textDecoration: 'none' }}>Mail dashboard &rarr;</Link>
          </div>
        </div>

        {/* modules */}
        <div className="aa" style={{ animationDelay: '.32s' }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: '#fff', letterSpacing: '1px', margin: '0 0 16px' }}>Jump to</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {nav.map((item) => (
              <Link key={item.t} href={item.href} className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '13px', padding: '16px' }}>
                <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(201,168,76,.09)', border: '1px solid rgba(201,168,76,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{icons[item.icon]}</svg>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: "'Cinzel', serif", fontSize: '13.5px', color: '#fff' }}>{item.t}</span>
                  <span style={{ display: 'block', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: '#d0c5b2', opacity: .45, marginTop: '1px' }}>{item.d}</span>
                </span>
                {item.count > 0 && (
                  <span className="num" style={{ fontSize: '12px', color: '#e6c364', background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.15)', padding: '2px 9px', borderRadius: '999px' }}>{item.count}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
