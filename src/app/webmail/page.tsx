'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import MailWorkspace from '@/components/mail/MailWorkspace'

export default function WebmailPage() {
  const [status, setStatus] = useState<'checking' | 'out' | 'in'>('checking')
  const [address, setAddress] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mail/webmail')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { setAddress(j.address); setStatus('in') })
      .catch(() => setStatus('out'))
  }, [])

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/mail/webmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), password: pw }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Sign in failed')
      setPw('')
      setStatus('in')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    await fetch('/api/mail/webmail', { method: 'DELETE' }).catch(() => {})
    setStatus('out')
    setAddress('')
  }

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0d0b', color: '#8a8577', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  if (status === 'out') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0d0b', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
        <form onSubmit={signIn} style={{ width: '100%', maxWidth: 360, background: '#17150f', border: '1px solid #33302a', borderRadius: 14, padding: '32px 28px' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, letterSpacing: '0.18em', color: '#efe9dc', textAlign: 'center', marginBottom: 4 }}>
            CZAAH <span style={{ color: '#c9a84c' }}>WEBMAIL</span>
          </div>
          <p style={{ color: '#8a8577', fontSize: 12.5, textAlign: 'center', margin: '0 0 24px' }}>Sign in to your @czaah.com mailbox</p>

          {error && (
            <div style={{ background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.3)', color: '#e88', fontSize: 12.5, padding: '8px 12px', borderRadius: 8, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <label style={{ display: 'block', fontSize: 11.5, color: '#8a8577', marginBottom: 6 }}>Email address</label>
          <input
            type="email" autoComplete="username" value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="you@czaah.com"
            style={{ width: '100%', background: '#0e0d0b', border: '1px solid #33302a', color: '#efe9dc', padding: '10px 12px', borderRadius: 8, fontSize: 14, marginBottom: 16, outline: 'none' }}
          />

          <label style={{ display: 'block', fontSize: 11.5, color: '#8a8577', marginBottom: 6 }}>Password</label>
          <input
            type="password" autoComplete="current-password" value={pw}
            onChange={(e) => setPw(e.target.value)}
            style={{ width: '100%', background: '#0e0d0b', border: '1px solid #33302a', color: '#efe9dc', padding: '10px 12px', borderRadius: 8, fontSize: 14, marginBottom: 22, outline: 'none' }}
          />

          <button
            type="submit" disabled={busy}
            style={{ width: '100%', background: '#c9a84c', color: '#1a1710', fontWeight: 700, fontSize: 13.5, padding: '11px', border: 0, borderRadius: 8, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p style={{ color: '#5f5b52', fontSize: 11, textAlign: 'center', marginTop: 18 }}>
            No password? Ask an administrator to set one in Admin → Mailboxes.
          </p>
        </form>
      </div>
    )
  }

  return (
    <div style={{ background: '#0e0d0b', minHeight: '100dvh' }}>
      <button
        onClick={signOut}
        style={{ position: 'fixed', top: 10, right: 14, zIndex: 60, background: 'rgba(30,28,22,0.9)', border: '1px solid #45403636', color: '#c9a84c', fontSize: 11.5, padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}
        title={address}
      >
        Sign out
      </button>
      <div style={{ padding: '10px 12px 0' }}>
        <MailWorkspace heading="Webmail" outboundLabel="You" />
      </div>
    </div>
  )
}
