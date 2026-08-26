'use client'
// @ts-nocheck

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-on-surface-variant raleway-text">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  function navigateByRole(profile: { role: string }) {
    if (redirect !== '/') {
      router.push(redirect)
    } else if (profile.role === 'super_admin' || profile.role === 'admin') {
      router.push('/admin')
    } else if (profile.role === 'partner') {
      router.push('/partner-network')
    } else {
      router.push('/dashboard')
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Supabase's client-side auth calls serialize across browser tabs via the
    // Web Locks API — with several czaah.com tabs open, that can stall for
    // several seconds per call. This is a hard safety net so the button never
    // stays stuck on "Signing in..." indefinitely; it doesn't cancel the
    // underlying request, it just stops making the user wait on it.
    const stallTimer = setTimeout(() => {
      setError('This is taking longer than expected. If you have other CZAAH tabs open, try closing them, then try again.')
      setLoading(false)
    }, 12000)

    try {
      const supabase = createClient()
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        return
      }

      const user = signInData.user
      if (!user) {
        setError('Signed in, but could not load your account. Please try again.')
        return
      }

      // Check if MFA is required
      const { data: mfaData } = await supabase.auth.mfa.listFactors()
      const verifiedFactors = mfaData?.totp?.filter(f => f.status === 'verified') || []

      if (verifiedFactors.length > 0) {
        setMfaFactorId(verifiedFactors[0].id)
        setMfaRequired(true)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || profile.status !== 'approved') {
        router.push('/pending')
        return
      }

      navigateByRole(profile)
    } catch (err) {
      console.error('[Login] Unexpected error during sign-in:', err)
      setError('Something went wrong signing you in. Please try again.')
    } finally {
      clearTimeout(stallTimer)
      setLoading(false)
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!mfaFactorId || !mfaCode) return
    setError('')
    setLoading(true)

    const stallTimer = setTimeout(() => {
      setError('This is taking longer than expected. If you have other CZAAH tabs open, try closing them, then try again.')
      setLoading(false)
    }, 12000)

    try {
      const supabase = createClient()

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode,
      })

      if (verifyError) {
        setError(verifyError.message)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Verified, but could not load your account. Please try again.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || profile.status !== 'approved') {
        router.push('/pending')
        return
      }

      navigateByRole(profile)
    } catch (err) {
      console.error('[Login] Unexpected error during MFA verify:', err)
      setError('Something went wrong verifying your code. Please try again.')
    } finally {
      clearTimeout(stallTimer)
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent('/reset-password')}`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setResetSent(true)
    setLoading(false)
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface pt-24 pb-16">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-block">
              <svg viewBox="-5 -12 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-24 w-auto mx-auto block">
                <defs>
                  <linearGradient id="authHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8a6f2e"/>
                    <stop offset="40%" stopColor="#c9a84c"/>
                    <stop offset="60%" stopColor="#e8c97a"/>
                    <stop offset="100%" stopColor="#8a6f2e"/>
                  </linearGradient>
                  <linearGradient id="authBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#c9a84c"/>
                    <stop offset="100%" stopColor="#8a6f2e"/>
                  </linearGradient>
                </defs>
                <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#authHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#authHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
                <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#authHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#authHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
                <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#authBodyGrad)" opacity="0.9"/>
                <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
                <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
              </svg>
            </Link>
          </div>

          {/* Form Card */}
          <div className="bg-surface border border-outline-variant/30 p-10">
            {mfaRequired ? (
              /* MFA Verification Mode */
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 border-2 border-primary/25 flex items-center justify-center mx-auto mb-5">
                    <span className="material-symbols-outlined text-primary text-3xl">lock</span>
                  </div>
                  <h2 className="cinzel-text text-xl text-on-surface mb-2">Two-Factor Authentication</h2>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">Enter the 6-digit code from your authenticator app.</p>
                </div>

                <form onSubmit={handleMfaVerify} className="flex flex-col gap-5">
                  <div>
                    <label className="text-on-surface-variant text-xs tracking-widest uppercase raleway-text block mb-2">Verification Code</label>
                    <input
                      type="text"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      maxLength={6}
                      autoFocus
                      className="w-full bg-transparent border-b border-outline-variant focus:border-primary text-on-surface py-3 outline-none transition-colors placeholder:text-on-surface-variant/40 raleway-text text-2xl text-center tracking-[0.5em]"
                      placeholder="000000"
                    />
                  </div>

                  {error && (
                    <p className="text-error raleway-text text-xs">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || mfaCode.length !== 6}
                    className="liquid-gold-bg text-on-primary w-full py-4 font-bold tracking-[0.2em] uppercase text-sm raleway-text transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => { setMfaRequired(false); setMfaCode(''); setMfaFactorId(null); setError('') }}
                    className="bg-transparent border-none cursor-pointer raleway-text text-sm text-primary hover:text-primary-fixed transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </>
            ) : forgotMode ? (
              /* Forgot Password Mode */
              resetSent ? (
                <div className="text-center">
                  <div className="w-16 h-16 border-2 border-primary/25 flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-primary text-3xl">mail</span>
                  </div>
                  <h2 className="cinzel-text text-xl text-on-surface mb-3">Check Your Email</h2>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-6">
                    We&apos;ve sent a password reset link to <strong className="text-primary">{email}</strong>. Please check your inbox and follow the instructions.
                  </p>
                  <button
                    onClick={() => { setForgotMode(false); setResetSent(false); setError('') }}
                    className="bg-transparent border-none cursor-pointer raleway-text text-sm text-primary hover:text-primary-fixed transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="cinzel-text text-xl text-on-surface mb-2 text-center">Reset Password</h2>
                  <p className="raleway-text text-sm text-on-surface-variant text-center mb-6 leading-relaxed">Enter your email address and we&apos;ll send you a link to reset your password.</p>

                  <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
                    <div>
                      <label className="text-on-surface-variant text-xs tracking-widest uppercase raleway-text block mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-transparent border-b border-outline-variant focus:border-primary text-on-surface py-3 outline-none transition-colors placeholder:text-on-surface-variant/40 raleway-text"
                        placeholder="your@email.com"
                      />
                    </div>

                    {error && (
                      <p className="text-error raleway-text text-xs">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="liquid-gold-bg text-on-primary w-full py-4 font-bold tracking-[0.2em] uppercase text-sm raleway-text transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <button
                      onClick={() => { setForgotMode(false); setError('') }}
                      className="bg-transparent border-none cursor-pointer raleway-text text-sm text-primary hover:text-primary-fixed transition-colors"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </>
              )
            ) : (
              /* Sign In Mode */
              <>
                <h2 className="cinzel-text text-xl text-on-surface mb-6 text-center">Sign In</h2>

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                  <div>
                    <label className="text-on-surface-variant text-xs tracking-widest uppercase raleway-text block mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-transparent border-b border-outline-variant focus:border-primary text-on-surface py-3 outline-none transition-colors placeholder:text-on-surface-variant/40 raleway-text"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-on-surface-variant text-xs tracking-widest uppercase raleway-text">Password</label>
                      <button
                        type="button"
                        onClick={() => { setForgotMode(true); setError('') }}
                        className="bg-transparent border-none cursor-pointer raleway-text text-[11px] text-primary/60 hover:text-primary transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-transparent border-b border-outline-variant focus:border-primary text-on-surface py-3 outline-none transition-colors placeholder:text-on-surface-variant/40 raleway-text"
                      placeholder="--------"
                    />
                  </div>

                  {error && (
                    <p className="text-error raleway-text text-xs">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="liquid-gold-bg text-on-primary w-full py-4 font-bold tracking-[0.2em] uppercase text-sm raleway-text transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-on-surface-variant raleway-text">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="text-primary hover:text-primary-fixed raleway-text no-underline transition-colors">
                    Become a Member
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
