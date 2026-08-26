'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { NotificationBell } from '@/components/NotificationBell'

interface Profile {
  full_name: string
  role: string
  status: string
}

export default function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Close sidebar on ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        window.location.href = '/login'
        return
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, role, status')
        .eq('id', session.user.id)
        .single()

      if (!prof) { window.location.href = '/login'; return }
      if (prof.status !== 'approved') { window.location.href = '/pending'; return }

      setProfile(prof)
      setLoading(false)
    }
    checkAuth()

    // Listen for sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.href = '/login'
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <span className="raleway-text text-sm text-on-surface-variant/40">Loading...</span>
      </div>
    )
  }

  if (!profile) return null

  const isAdminRole = profile.role === 'admin' || profile.role === 'super_admin'
  const isRealEstatePartner = profile.role === 'real_estate_partner'
  const isRegistrant = ['worker', 'employer', 'oep_partner'].includes(profile.role)
  const canLiveChat = ['employer', 'oep_partner'].includes(profile.role)

  const portalLabels: Record<string, string> = {
    worker: 'Worker Portal',
    employer: 'Employer Portal',
    oep_partner: 'Employment Promoter Portal',
  }
  const portalLabel = portalLabels[profile.role] || 'Member Portal'

  // Grouped navigation sections
  const navSections: { label?: string; links: { href: string; label: string; icon: string }[] }[] = [
    {
      links: [
        { href: '/dashboard', label: 'Overview', icon: 'dashboard' },
        ...(!isRegistrant ? [{ href: '/dashboard/membership-card', label: 'Membership Card', icon: 'card_membership' }] : []),
        { href: '/dashboard/notifications', label: 'Notifications', icon: 'notifications' },
      ],
    },
    ...(isRegistrant ? [{
      links: [
        { href: '/dashboard/registration', label: 'My Registration', icon: 'assignment_ind' },
        ...(canLiveChat ? [{ href: '/dashboard/messages', label: 'Live Chat', icon: 'chat' }] : []),
      ],
    }] : []),
    ...(!isRegistrant ? [{
      label: 'Business',
      links: [
        { href: '/dashboard/enquiries', label: 'Enquiries', icon: 'mail' },
        { href: '/dashboard/investments', label: 'Investments', icon: 'trending_up' },
        { href: '/dashboard/meetings', label: 'Meetings', icon: 'event' },
      ],
    }] : []),
    ...(isRealEstatePartner ? [{
      label: 'Properties',
      links: [
        { href: '/dashboard/properties', label: 'My Listings', icon: 'apartment' },
        { href: '/dashboard/properties/new', label: 'Add Property', icon: 'add_home' },
        { href: '/dashboard/property-chats', label: 'Property Chats', icon: 'forum' },
      ],
    }] : []),
    {
      label: 'Resources',
      links: [
        { href: '/dashboard/documents', label: 'Documents', icon: 'description' },
        ...(!isRegistrant ? [
          { href: '/dashboard/paperwork', label: 'Paperwork', icon: 'assignment' },
          { href: '/dashboard/broadcasts', label: 'Broadcasts', icon: 'campaign' },
          { href: '/dashboard/bookmarks', label: 'Bookmarks', icon: 'bookmark' },
        ] : []),
      ],
    },
    {
      label: 'Account',
      links: [
        ...(!isRegistrant ? [{ href: '/dashboard/history', label: 'History', icon: 'history' }] : []),
        { href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="dashboard-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {/* Logo Area */}
        <div className="px-6 py-6 border-b border-outline-variant/10">
          <Link href="/dashboard" className="no-underline flex items-center gap-3">
            <svg viewBox="-5 -12 100 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
              <defs>
                <linearGradient id="mbHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8a6f2e"/>
                  <stop offset="40%" stopColor="#c9a84c"/>
                  <stop offset="60%" stopColor="#e8c97a"/>
                  <stop offset="100%" stopColor="#8a6f2e"/>
                </linearGradient>
                <linearGradient id="mbBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#c9a84c"/>
                  <stop offset="100%" stopColor="#8a6f2e"/>
                </linearGradient>
              </defs>
              <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#mbHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#mbHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
              <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#mbHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#mbHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
              <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#mbBodyGrad)" opacity="0.9"/>
              <path d="M 42 64 C 41 70, 40 76, 41 82" stroke="url(#mbHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
              <path d="M 45 65 C 45 72, 45 78, 45 84" stroke="url(#mbHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55"/>
              <path d="M 48 64 C 49 70, 50 76, 49 82" stroke="url(#mbHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
              <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
              <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
              <path d="M 38 58 C 36 66, 35 76, 38 86 C 40 90, 50 90, 52 86 C 55 76, 54 66, 52 58" fill="url(#mbBodyGrad)" opacity="0.5"/>
              <line x1="35" y1="108" x2="55" y2="108" stroke="url(#mbHornGrad)" strokeWidth="1.5" opacity="0.7"/>
            </svg>
            <div>
              <span className="cinzel-text font-semibold text-lg tracking-[6px] text-primary block leading-none">CZAAH</span>
              <span className="raleway-text text-[10px] tracking-[3px] uppercase text-primary/40 mt-1 block">{portalLabel}</span>
            </div>
          </Link>
        </div>

        {/* View Main Site */}
        <div className="px-3 py-3 border-b border-outline-variant/10">
          <Link
            href="/"
            className="member-nav-link"
            style={{ opacity: 0.5, fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '6px 16px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
            View Main Site
          </Link>
          {isAdminRole && (
            <Link
              href="/admin"
              className="member-nav-link"
              style={{ opacity: 0.7, fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '6px 16px', color: 'var(--color-primary)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>admin_panel_settings</span>
              Go to Super Admin
            </Link>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 overflow-y-auto flex flex-col gap-px">
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.label && (
                <div className={`${sIdx === 0 ? '' : 'pt-4'} pb-1.5 pl-4`}>
                  <p className="cinzel-text text-[10px] tracking-[3px] uppercase text-on-surface/20 m-0">{section.label}</p>
                </div>
              )}
              {section.links.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="member-nav-link"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      borderLeftColor: isActive ? 'var(--color-primary)' : undefined,
                      color: isActive ? 'var(--color-on-surface)' : undefined,
                      background: isActive ? 'var(--color-surface-container)' : undefined,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: isActive ? 1 : 0.5 }}>{link.icon}</span>
                    {link.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-outline-variant/10 flex flex-col gap-2.5">
          {!isRegistrant && (
            <Link
              href="/dashboard/enquiries/new"
              className="member-footer-link raleway-text text-[11px] tracking-[1.5px] text-primary/50 no-underline uppercase transition-colors duration-300"
            >
              + New Enquiry
            </Link>
          )}
          <p className="raleway-text text-xs text-on-surface/30 m-0 overflow-hidden text-ellipsis whitespace-nowrap">{profile.full_name}</p>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="member-signout-btn bg-transparent border-none p-0 cursor-pointer raleway-text text-[11px] tracking-[1px] text-primary/50 transition-colors duration-300"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-surface flex flex-col min-w-0">
        {/* Top bar with notification bell */}
        <div
          className="dashboard-topbar flex items-center justify-end px-10 pt-3 gap-3"
        >
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              marginRight: 'auto',
            }}
          >
            <span className="material-symbols-outlined text-on-surface-variant/50" style={{ fontSize: '24px' }}>menu</span>
          </button>
          <span className="raleway-text text-xs text-on-surface/30">{profile.full_name}</span>
          <NotificationBell />
        </div>
        <div className="dashboard-content flex-1" style={{ padding: '24px 40px 40px' }}>{children}</div>
      </main>

      {/* Hover styles */}
      <style>{`
        .dashboard-sidebar {
          width: 260px;
          background: var(--color-surface-container-lowest);
          border-right: 1px solid color-mix(in srgb, var(--color-outline-variant) 10%, transparent);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .member-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px;
          font-family: 'Raleway', sans-serif;
          font-size: 13px;
          color: var(--color-on-surface-variant);
          text-decoration: none;
          border-left: 2px solid transparent;
          transition: all 0.25s ease;
          letter-spacing: 0.5px;
        }
        .member-nav-link:hover {
          color: var(--color-primary);
          border-left-color: var(--color-primary);
          background: var(--color-surface-container);
        }
        .member-footer-link:hover {
          color: var(--color-on-surface) !important;
        }
        .member-signout-btn:hover {
          color: var(--color-primary) !important;
        }
        @media (max-width: 767px) {
          .dashboard-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            z-index: 50;
            transition: left 0.3s ease;
          }
          .dashboard-sidebar.closed {
            left: -260px;
          }
          .dashboard-sidebar.open {
            left: 0;
          }
          .dashboard-sidebar-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 49;
          }
          .hamburger-btn {
            display: flex !important;
          }
          .dashboard-content {
            padding: 16px !important;
          }
          .dashboard-topbar {
            padding: 12px 16px 0 !important;
          }
        }
        @media (min-width: 768px) {
          .dashboard-sidebar {
            position: relative;
          }
          .dashboard-sidebar-backdrop {
            display: none;
          }
          .hamburger-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
