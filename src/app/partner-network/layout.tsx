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
  const [menuOpen, setMenuOpen] = useState(false)
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

  useEffect(() => { setMenuOpen(false) }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <span className="raleway-text text-sm text-on-surface-variant/40">Loading...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface-container border-r border-outline-variant/10 flex flex-col transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-6 py-6 border-b border-outline-variant/10">
          <Link href="/partner-network" className="no-underline">
            <span className="cinzel-text text-lg tracking-[0.15em] text-primary block">CZAAH</span>
            <span className="raleway-text text-[10px] tracking-[0.2em] uppercase text-on-surface-variant/50">Partner Network</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
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
        </nav>
        <div className="px-5 py-4 border-t border-outline-variant/10 flex flex-col gap-3">
          <p className="raleway-text text-xs text-on-surface-variant/50 truncate">{fullName}</p>
          <Link href="/dashboard" className="raleway-text text-xs text-on-surface-variant/50 hover:text-primary transition-colors">&larr; Main Site</Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="raleway-text text-xs text-primary/70 hover:text-primary transition-colors">Sign Out</button>
          </form>
        </div>
      </aside>

      {menuOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-outline-variant/10 bg-surface-container">
          <span className="cinzel-text text-sm tracking-[0.15em] text-primary">CZAAH Partner Network</span>
          <button onClick={() => setMenuOpen((v) => !v)} className="text-on-surface-variant">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
        <main className="flex-1 p-5 sm:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
