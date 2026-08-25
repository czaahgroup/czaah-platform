'use client'
// @ts-nocheck

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // The normal path is /api/auth/callback exchanging the emailed code for
    // a session server-side (setting proper cookies) before redirecting
    // here, so getSession() below just finds it already established. This
    // fallback also handles a ?code= landing directly on this page (e.g. an
    // invite link sent before that redirect was wired up) by exchanging it
    // client-side instead of leaving the user stuck on "Link Invalid".
    const supabase = createClient()
    let resolved = false

    async function init() {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          resolved = true
          setReady(true)
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        resolved = true
        setReady(true)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        resolved = true
        setReady(true)
      }
    })

    init()

    // If nothing resolved after a few seconds, the link is invalid, expired,
    // or was opened in a different browser than the one that requested it.
    const timeout = setTimeout(() => {
      if (!resolved) setLinkInvalid(true)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    let destination = '/dashboard'
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (profile?.role === 'partner') destination = '/partner-network'
      else if (profile?.role === 'super_admin' || profile?.role === 'admin') destination = '/admin'
    }

    setSuccess(true)
    setTimeout(() => router.push(destination), 2000)
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-md mx-auto">

          <div className="border border-outline-variant/20 p-12">

            {success ? (
              <div className="text-center">
                {/* Checkmark Icon */}
                <div className="w-16 h-16 border border-primary/25 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="cinzel-text text-xl text-primary mb-3 tracking-wider">
                  Password Updated
                </h2>
                <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">
                  Your password has been reset. Redirecting to your dashboard...
                </p>
              </div>
            ) : linkInvalid ? (
              <div className="text-center">
                <h2 className="cinzel-text text-xl text-primary mb-3 tracking-wider">
                  Link Invalid or Expired
                </h2>
                <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-6">
                  This password reset link no longer works. It may have expired, already been used, or been opened in a different browser than the one you requested it from. Please request a new link.
                </p>
                <Link href="/login" className="text-primary raleway-text text-sm hover:underline">
                  Back to Login
                </Link>
              </div>
            ) : !ready ? (
              <div className="text-center">
                <p className="raleway-text text-sm text-on-surface-variant/40">
                  Verifying reset link...
                </p>
              </div>
            ) : (
              <>
                <h2 className="cinzel-text text-xl text-primary mb-2 text-center tracking-wider">
                  Set New Password
                </h2>
                <p className="raleway-text text-[13px] text-on-surface-variant text-center mb-8 leading-relaxed">
                  Enter your new password below.
                </p>

                <form onSubmit={handleReset} className="flex flex-col gap-6">
                  <div>
                    <label className="text-on-surface-variant text-xs tracking-widest uppercase raleway-text mb-2 block">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Min. 8 characters"
                      className="w-full bg-transparent border-b border-outline-variant focus:border-primary text-on-surface py-3 outline-none transition-colors placeholder:text-on-surface-variant/40 raleway-text text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-on-surface-variant text-xs tracking-widest uppercase raleway-text mb-2 block">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter your password"
                      className="w-full bg-transparent border-b border-outline-variant focus:border-primary text-on-surface py-3 outline-none transition-colors placeholder:text-on-surface-variant/40 raleway-text text-sm"
                    />
                  </div>

                  {error && (
                    <p className="raleway-text text-xs text-red-500 m-0">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="liquid-gold-bg text-on-primary w-full py-4 font-bold tracking-[0.2em] uppercase text-sm raleway-text border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Back to login link */}
          <div className="text-center mt-8">
            <Link href="/login" className="text-primary raleway-text text-sm hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
