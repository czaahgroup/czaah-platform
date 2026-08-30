'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MailWorkspace from '@/components/mail/MailWorkspace'

function Markhor({ className }: { className?: string }) {
  return (
    <svg viewBox="-5 -12 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="wmHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8a6f2e" />
          <stop offset="40%" stopColor="#c9a84c" />
          <stop offset="60%" stopColor="#e8c97a" />
          <stop offset="100%" stopColor="#8a6f2e" />
        </linearGradient>
        <linearGradient id="wmBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c9a84c" />
          <stop offset="100%" stopColor="#8a6f2e" />
        </linearGradient>
      </defs>
      <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#wmHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#wmHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#wmHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#wmHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#wmBodyGrad)" opacity="0.9" />
      <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9" />
      <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9" />
    </svg>
  )
}

export default function WebmailPage() {
  const [phase, setPhase] = useState<'checking' | 'out' | 'in'>('checking')
  const [address, setAddress] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mail/webmail')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { setAddress(j.address); setPhase('in') })
      .catch(() => setPhase('out'))
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
      setPhase('in')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    await fetch('/api/mail/webmail', { method: 'DELETE' }).catch(() => {})
    setAddress('')
    setPhase('out')
  }

  if (phase === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <span className="raleway-text text-sm text-on-surface-variant/50">Loading…</span>
      </div>
    )
  }

  if (phase === 'out') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-surface">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-9">
            <Markhor className="h-20 w-auto mx-auto block" />
          </div>

          <div className="bg-surface border border-outline-variant/30 p-10">
            <h1 className="cinzel-text text-xl text-on-surface mb-1 text-center">CZAAH Webmail</h1>
            <p className="raleway-text text-sm text-on-surface-variant text-center mb-8">
              Sign in to your <span className="text-primary">@czaah.com</span> mailbox
            </p>

            <form onSubmit={signIn} className="flex flex-col gap-5">
              <div>
                <label className="text-on-surface-variant text-xs tracking-widest uppercase raleway-text block mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  autoComplete="username"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="you@czaah.com"
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary text-on-surface py-3 outline-none transition-colors placeholder:text-on-surface-variant/40 raleway-text"
                />
              </div>

              <div>
                <label className="text-on-surface-variant text-xs tracking-widest uppercase raleway-text block mb-2">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary text-on-surface py-3 outline-none transition-colors placeholder:text-on-surface-variant/40 raleway-text"
                />
              </div>

              {error && <p className="text-error raleway-text text-xs">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="liquid-gold-bg text-on-primary w-full py-4 font-bold tracking-[0.2em] uppercase text-sm raleway-text transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="raleway-text text-[11px] text-on-surface-variant/50 text-center mt-7 leading-relaxed">
              No password yet? Ask an administrator to set one for your address.
            </p>
          </div>

          <div className="text-center mt-6">
            <Link href="/" className="raleway-text text-xs text-on-surface-variant/60 hover:text-primary transition-colors">
              ← czaah.com
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="webmail-shell bg-surface" style={{ minHeight: '100dvh' }}>
      <style>{`.webmail-shell .czaah-mail { height: calc(100dvh - 57px) !important; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }`}</style>
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-outline-variant/30 bg-surface">
        <div className="flex items-center gap-2.5">
          <Markhor className="h-6 w-auto" />
          <span className="cinzel-text text-sm tracking-[0.16em] text-on-surface">
            CZAAH <span className="text-primary">MAIL</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="raleway-text text-xs text-on-surface-variant/70 hidden sm:inline">{address}</span>
          <button
            onClick={signOut}
            className="raleway-text text-xs tracking-wider uppercase text-on-surface-variant hover:text-primary border border-outline-variant/40 hover:border-primary/50 px-3 py-1.5 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <MailWorkspace heading="Webmail" outboundLabel="You" />
    </div>
  )
}
