'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MAIL_THEME_CSS } from '@/components/mail/mail-theme'

function fmtMins(m: number | null) {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)} min`
  if (m < 1440) return `${(m / 60).toFixed(1)} h`
  return `${(m / 1440).toFixed(1)} d`
}
function fmtAge(h: number) {
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

export default function MailDashboardPage() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mail/dashboard')
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setD(j)))
      .catch(() => setErr('Failed to load.'))
  }, [])

  if (err) return <div className="czaah-mail" style={{ padding: 24, color: 'var(--mail-danger)' }}><style>{MAIL_THEME_CSS}</style>{err}</div>
  if (!d) return <div className="czaah-mail" style={{ padding: 24, color: 'var(--mail-text-faint)' }}><style>{MAIL_THEME_CSS}</style>Loading…</div>

  const t = d.totals
  const maxVol = Math.max(1, ...d.mailboxes.map((m: any) => m.inbound30 + m.outbound30))

  const Tile = ({ label, value, sub }: any) => (
    <div style={{ background: 'var(--mail-panel)', border: '1px solid var(--mail-border)', borderRadius: '10px', padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--mail-text-faint)' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--mail-text)', marginTop: '4px', fontFamily: "'Cinzel', serif" }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--mail-text-dim)', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
  const Section = ({ title, children }: any) => (
    <div style={{ marginTop: '26px' }}>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '15px', color: 'var(--mail-text)', margin: '0 0 12px', letterSpacing: '0.04em' }}>{title}</h2>
      {children}
    </div>
  )

  return (
    <div className="czaah-mail" style={{ padding: '20px 24px 60px', background: 'var(--mail-bg)', minHeight: '100%' }}>
      <style>{MAIL_THEME_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: 'var(--mail-text)', margin: 0, letterSpacing: '0.06em' }}>
          CZAAH <span style={{ color: 'var(--mail-accent)' }}>MAIL</span> — Dashboard
        </h1>
        <span style={{ fontSize: '11px', color: 'var(--mail-text-faint)' }}>generated {new Date(d.generatedAt).toLocaleString()}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '16px' }}>
        <Tile label="Inbound (30d)" value={t.inbound30} />
        <Tile label="Outbound (30d)" value={t.outbound30} />
        <Tile label="Unanswered" value={t.unanswered} sub="awaiting a reply" />
        <Tile label="Contacts" value={t.contacts} sub={`+${d.contactsNew30} in 30d`} />
        <Tile label="AI actions" value={t.aiActions} sub={`${t.aiActions30} in 30d`} />
        <Tile label="AI spend" value={`$${t.aiCostAllTime.toFixed(2)}`} sub="all-time est." />
      </div>

      <Section title="Mailbox activity — last 30 days">
        <div style={{ background: 'var(--mail-panel)', border: '1px solid var(--mail-border)', borderRadius: '10px', overflow: 'hidden' }}>
          {d.mailboxes.map((m: any, i: number) => {
            const total = m.inbound30 + m.outbound30
            return (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 130px', gap: '14px', alignItems: 'center', padding: '11px 16px', borderTop: i ? '1px solid var(--mail-border)' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: 'var(--mail-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--mail-text-faint)' }}>{m.address}</div>
                </div>
                <div>
                  <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--mail-hover)' }}>
                    <div style={{ width: `${(m.inbound30 / maxVol) * 100}%`, background: '#1a73e8' }} />
                    <div style={{ width: `${(m.outbound30 / maxVol) * 100}%`, background: '#e37400' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--mail-text-faint)', marginTop: '3px' }}>
                    <span style={{ color: '#1a73e8' }}>{m.inbound30} in</span> · <span style={{ color: '#e37400' }}>{m.outbound30} out</span>{total === 0 ? ' · quiet' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: 'var(--mail-text)' }}>{fmtMins(m.medianFirstResponseMins)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--mail-text-faint)' }}>median 1st reply{m.responsesSampled ? ` (${m.responsesSampled})` : ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title={`Unanswered queue (${d.unanswered.length})`}>
        {d.unanswered.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--mail-text-faint)' }}>Everything's been replied to. 🎉</p>
        ) : (
          <div style={{ background: 'var(--mail-panel)', border: '1px solid var(--mail-border)', borderRadius: '10px', overflow: 'hidden' }}>
            {d.unanswered.map((u: any, i: number) => (
              <Link key={u.threadId} href="/admin/mail" style={{ textDecoration: 'none', display: 'grid', gridTemplateColumns: '1fr 150px 70px', gap: '12px', alignItems: 'center', padding: '10px 16px', borderTop: i ? '1px solid var(--mail-border)' : 'none' }}>
                <span style={{ fontSize: '13px', color: 'var(--mail-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.externalAddress}</span>
                <span style={{ fontSize: '11px', color: 'var(--mail-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.mailbox}</span>
                <span style={{ fontSize: '12px', color: u.ageHours > 48 ? 'var(--mail-danger)' : 'var(--mail-accent)', textAlign: 'right', fontWeight: 600 }}>{fmtAge(u.ageHours)}</span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
        <Section title="AI usage">
          <div style={{ background: 'var(--mail-panel)', border: '1px solid var(--mail-border)', borderRadius: '10px', padding: '14px 16px' }}>
            {Object.keys(d.aiByAction).length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--mail-text-faint)', margin: 0 }}>No AI actions yet.</p>
            ) : (
              Object.entries(d.aiByAction).map(([a, n]: any) => (
                <div key={a} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', color: 'var(--mail-text-dim)' }}>
                  <span style={{ textTransform: 'capitalize' }}>{a}</span><span style={{ color: 'var(--mail-text)' }}>{n}</span>
                </div>
              ))
            )}
            <div style={{ borderTop: '1px solid var(--mail-border)', marginTop: '8px', paddingTop: '8px', fontSize: '11px', color: 'var(--mail-text-faint)' }}>
              {(t.aiTokens.input / 1000).toFixed(0)}k in · {(t.aiTokens.output / 1000).toFixed(0)}k out · ${t.aiCostAllTime.toFixed(2)} est.
            </div>
          </div>
        </Section>

        <Section title="Contacts by status">
          <div style={{ background: 'var(--mail-panel)', border: '1px solid var(--mail-border)', borderRadius: '10px', padding: '14px 16px' }}>
            {Object.entries(d.contactsByStatus).map(([s, n]: any) => (
              <div key={s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', color: 'var(--mail-text-dim)' }}>
                <span style={{ textTransform: 'capitalize' }}>{s}</span><span style={{ color: 'var(--mail-text)' }}>{n}</span>
              </div>
            ))}
            {Object.keys(d.contactsByStatus).length === 0 && <p style={{ fontSize: '12px', color: 'var(--mail-text-faint)', margin: 0 }}>No contacts annotated yet.</p>}
          </div>
        </Section>

        <Section title="Top contacts by volume">
          <div style={{ background: 'var(--mail-panel)', border: '1px solid var(--mail-border)', borderRadius: '10px', padding: '14px 16px' }}>
            {d.topContacts.map((c: any) => (
              <div key={c.email} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', color: 'var(--mail-text-dim)', gap: '10px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>
                <span style={{ color: 'var(--mail-text)', flexShrink: 0 }}>{c.count}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Templates">
        <p style={{ fontSize: '13px', color: 'var(--mail-text-dim)' }}>
          {t.templates.shared} org-wide · {t.templates.personal} personal
        </p>
      </Section>
    </div>
  )
}
