'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/partner-network', label: 'Dashboard', icon: 'dashboard' },
  { href: '/partner-network/membership-card', label: 'Membership Card', icon: 'badge' },
  { href: '/partner-network/add-opportunity', label: 'Add Opportunity', icon: 'add_business' },
  { href: '/partner-network/opportunities', label: 'My Opportunities', icon: 'work' },
  { href: '/partner-network/messages', label: 'Messages', icon: 'mail' },
  { href: '/partner-network/profile', label: 'My Profile', icon: 'account_circle' },
]

export default function PartnerNetworkLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', session.user.id).single()
      if (!profile || (profile.role !== 'partner' && profile.role !== 'super_admin')) {
        window.location.href = '/dashboard'
        return
      }
      setFullName(profile.full_name || '')
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <span className="raleway-text text-sm text-on-surface-variant/40">Loading...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      <aside className="w-64 shrink-0 bg-surface-container border-r border-outline-variant/10 flex flex-col min-h-screen">
        <div className="px-6 py-6 border-b border-outline-variant/10">
          <Link href="/partner-network" className="no-underline flex items-center gap-3">
            <svg viewBox="-5 -12 100 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto shrink-0">
              <defs>
                <linearGradient id="pnHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8a6f2e"/>
                  <stop offset="40%" stopColor="#c9a84c"/>
                  <stop offset="60%" stopColor="#e8c97a"/>
                  <stop offset="100%" stopColor="#8a6f2e"/>
                </linearGradient>
                <linearGradient id="pnBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#c9a84c"/>
                  <stop offset="100%" stopColor="#8a6f2e"/>
                </linearGradient>
              </defs>
              <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#pnHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#pnHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
              <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#pnHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#pnHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
              <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#pnBodyGrad)" opacity="0.9"/>
              <path d="M 42 64 C 41 70, 40 76, 41 82" stroke="url(#pnHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
              <path d="M 45 65 C 45 72, 45 78, 45 84" stroke="url(#pnHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55"/>
              <path d="M 48 64 C 49 70, 50 76, 49 82" stroke="url(#pnHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
              <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
              <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
              <path d="M 38 58 C 36 66, 35 76, 38 86 C 40 90, 50 90, 52 86 C 55 76, 54 66, 52 58" fill="url(#pnBodyGrad)" opacity="0.5"/>
              <line x1="35" y1="108" x2="55" y2="108" stroke="url(#pnHornGrad)" strokeWidth="1.5" opacity="0.7"/>
            </svg>
            <div>
              <span
                className="cinzel-text text-lg tracking-[0.15em] block"
                style={{
                  color: 'transparent',
                  background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 30%, #e8c97a 50%, #c9a84c 70%, #8a6f2e 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                }}
              >CZAAH</span>
              <span className="raleway-text text-[10px] tracking-[0.2em] uppercase text-on-surface-variant/50">Partner Network</span>
            </div>
          </Link>
        </div>
        <div className="px-3 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm raleway-text transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </div>
        <div className="px-5 py-4 border-t border-outline-variant/10 flex flex-col gap-3 mt-auto">
          <p className="raleway-text text-xs text-on-surface-variant/50 truncate">{fullName}</p>
          <Link href="/dashboard" className="raleway-text text-xs text-on-surface-variant/50 hover:text-primary transition-colors">&larr; Main Site</Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="raleway-text text-xs text-primary/70 hover:text-primary transition-colors">Sign Out</button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-5 sm:p-8">
        {children}
      </main>
    </div>
  )
}
