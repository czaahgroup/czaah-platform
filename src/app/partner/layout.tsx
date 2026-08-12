'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabaseClient = createClient()

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session?.user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'investment_partner' && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setUserName(profile?.full_name || session.user.email || '')
      setLoading(false)
    }
    checkAuth()
  }, [router])

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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <p style={{ fontFamily: "'Raleway', sans-serif", color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  function isActive(href: string) {
    if (href === '/partner') return pathname === '/partner'
    return pathname.startsWith(href)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="partner-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`partner-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {/* Logo Area */}
        <div style={{
          padding: '28px 24px 22px',
          borderBottom: '1px solid rgba(77,70,55,0.15)',
        }}>
          <Link href="/partner" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg className="markhor-mark" viewBox="-5 -12 100 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '32px', width: 'auto' }}>
              <defs>
                <linearGradient id="ptHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8a6f2e"/>
                  <stop offset="40%" stopColor="#c9a84c"/>
                  <stop offset="60%" stopColor="#e8c97a"/>
                  <stop offset="100%" stopColor="#8a6f2e"/>
                </linearGradient>
                <linearGradient id="ptBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#c9a84c"/>
                  <stop offset="100%" stopColor="#8a6f2e"/>
                </linearGradient>
              </defs>
              <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#ptHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#ptHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
              <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#ptHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#ptHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
              <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#ptBodyGrad)" opacity="0.9"/>
              <path d="M 42 64 C 41 70, 40 76, 41 82" stroke="url(#ptHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
              <path d="M 45 65 C 45 72, 45 78, 45 84" stroke="url(#ptHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55"/>
              <path d="M 48 64 C 49 70, 50 76, 49 82" stroke="url(#ptHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
              <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
              <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
              <path d="M 38 58 C 36 66, 35 76, 38 86 C 40 90, 50 90, 52 86 C 55 76, 54 66, 52 58" fill="url(#ptBodyGrad)" opacity="0.5"/>
              <line x1="35" y1="108" x2="55" y2="108" stroke="url(#ptHornGrad)" strokeWidth="1.5" opacity="0.7"/>
            </svg>
            <div>
              <span style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 600,
                fontSize: '18px',
                letterSpacing: '6px',
                color: 'transparent',
                background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 30%, #e8c97a 50%, #c9a84c 70%, #8a6f2e 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                lineHeight: 1,
                display: 'block',
              }}>CZAAH</span>
              <span style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '10px',
                letterSpacing: '3px',
                textTransform: 'uppercase' as const,
                color: 'rgba(201,168,76,0.4)',
                marginTop: '4px',
                display: 'block',
              }}>Investment Partner</span>
            </div>
          </Link>
        </div>

        {/* View Main Site */}
        <div style={{ padding: '12px 12px', borderBottom: '1px solid rgba(77,70,55,0.15)' }}>
          <Link
            href="/"
            className="partner-footer-link"
            onClick={() => setSidebarOpen(false)}
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              letterSpacing: '1.5px',
              color: 'rgba(255,255,255,0.35)',
              textDecoration: 'none',
              transition: 'color 0.3s ease',
              textTransform: 'uppercase' as const,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
            View Main Site
          </Link>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <NavLink href="/partner" label="My Deals" active={isActive('/partner') && !pathname.startsWith('/partner/submit') && !pathname.startsWith('/partner/documents')} onClick={() => setSidebarOpen(false)} />
          <NavLink href="/partner/submit" label="Submit Deal" active={isActive('/partner/submit')} onClick={() => setSidebarOpen(false)} />
          <NavLink href="/partner/documents" label="Documents" active={isActive('/partner/documents')} onClick={() => setSidebarOpen(false)} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(77,70,55,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <p style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.3)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{userName}</p>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="partner-signout-btn"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '11px',
                letterSpacing: '1px',
                color: 'rgba(201,168,76,0.5)',
                transition: 'color 0.3s ease',
              }}
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        background: '#131313',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}>
        {/* Top bar with hamburger */}
        <div
          className="partner-topbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '12px 40px 0',
            gap: '12px',
          }}
        >
          <button
            className="partner-hamburger-btn"
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.3)',
          }}>{userName}</span>
        </div>
        <div className="partner-content" style={{ padding: '24px 40px 40px', flex: 1 }}>{children}</div>
      </main>

      {/* Hover styles */}
      <style>{`
        .partner-sidebar {
          width: 260px;
          background: #0e0e0e;
          border-right: 1px solid rgba(77,70,55,0.15);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .partner-nav-link {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          font-family: 'Raleway', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          border-left: 2px solid transparent;
          border-radius: 0;
          transition: all 0.25s ease;
          letter-spacing: 0.5px;
        }
        .partner-nav-link:hover {
          color: #fff;
          border-left-color: rgba(201,168,76,0.3);
          background: rgba(255,255,255,0.02);
        }
        .partner-nav-link-active {
          color: #fff !important;
          border-left-color: #C9A84C !important;
          background: rgba(201,168,76,0.06) !important;
        }
        .partner-footer-link:hover {
          color: rgba(255,255,255,0.7) !important;
        }
        .partner-signout-btn:hover {
          color: rgba(201,168,76,1) !important;
        }
        @media (max-width: 767px) {
          .partner-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            z-index: 50;
            transition: left 0.3s ease;
          }
          .partner-sidebar.closed {
            left: -260px;
          }
          .partner-sidebar.open {
            left: 0;
          }
          .partner-sidebar-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 49;
          }
          .partner-hamburger-btn {
            display: flex !important;
          }
          .partner-content {
            padding: 16px !important;
          }
          .partner-topbar {
            padding: 12px 16px 0 !important;
          }
        }
        @media (min-width: 768px) {
          .partner-sidebar {
            position: relative;
          }
          .partner-sidebar-backdrop {
            display: none;
          }
          .partner-hamburger-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

function NavLink({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <Link href={href} className={`partner-nav-link${active ? ' partner-nav-link-active' : ''}`} onClick={onClick}>
      {label}
    </Link>
  )
}
