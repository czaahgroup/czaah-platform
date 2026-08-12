'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

export default function PendingPage() {
  const [status, setStatus] = useState<string>('pending_kyc_review')
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkStatus() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status, rejection_reason')
        .eq('id', user.id)
        .single()

      if (profile?.status === 'approved') {
        if (profile.role === 'super_admin') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
        return
      }

      setStatus(profile?.status || 'pending_kyc_review')
      setRejectionReason(profile?.rejection_reason || null)
      setLoading(false)
    }

    checkStatus()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="raleway-text text-sm text-on-surface-variant/40">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-md mx-auto text-center">

          {/* Status Content */}
          <div className="border border-outline-variant/20 p-12">

            {status === 'pending_kyc_review' && (
              <>
                {/* Clock Icon */}
                <div className="w-[72px] h-[72px] border border-primary/25 flex items-center justify-center mx-auto mb-8">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="cinzel-text text-xl text-primary mb-4 tracking-wider">
                  Application Under Review
                </h2>
                <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">
                  Thank you for applying to become a CZAAH member. Our team is reviewing your application and supporting documents. You will be notified within 48 hours.
                </p>
              </>
            )}

            {status === 'rejected' && (
              <>
                {/* X Icon */}
                <div className="w-[72px] h-[72px] border border-red-600/25 flex items-center justify-center mx-auto mb-8">
                  <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="cinzel-text text-xl text-primary mb-4 tracking-wider">
                  Application Not Approved
                </h2>
                {rejectionReason && (
                  <div className="border border-red-600/15 p-4 mb-5">
                    <p className="raleway-text text-[13px] text-on-surface-variant">
                      <span className="text-red-600 font-semibold">Reason: </span>
                      {rejectionReason}
                    </p>
                  </div>
                )}
                <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-8">
                  Unfortunately, your application was not approved at this time. You may resubmit with updated information.
                </p>
                <button
                  onClick={() => router.push('/register')}
                  className="liquid-gold-bg text-on-primary w-full py-4 font-bold tracking-[0.2em] uppercase text-sm raleway-text border-none cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Resubmit Application
                </button>
              </>
            )}

            {status !== 'pending_kyc_review' && status !== 'rejected' && (
              <>
                {/* Clock Icon */}
                <div className="w-[72px] h-[72px] border border-primary/25 flex items-center justify-center mx-auto mb-8">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="cinzel-text text-xl text-primary mb-4 tracking-wider">
                  Account Pending
                </h2>
                <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">
                  Your account is not yet active. Please contact us at{' '}
                  <a href="mailto:info@czaah.com" className="text-primary hover:underline">info@czaah.com</a>{' '}
                  for assistance.
                </p>
              </>
            )}
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="mt-8 bg-transparent border-none raleway-text text-sm text-primary/50 hover:text-primary cursor-pointer transition-colors"
          >
            Sign Out
          </button>
        </div>
      </main>
      <Footer />
    </>
  )
}
