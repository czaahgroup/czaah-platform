'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { NotificationBell } from '@/components/NotificationBell'
import { SearchOverlay } from '@/components/SearchOverlay'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SECTORS = [
  { name: 'Mines & Minerals', href: '/sectors/minerals', icon: '\u25C6', desc: 'Copper, gold, rare earths, coal' },
  { name: 'Real Estate', href: '/sectors/realestate', icon: '\u2302', desc: 'UK, UAE, Saudi, Qatar & Pakistan' },
  { name: 'Technology & IT', href: '/sectors/technology', icon: '\u2699', desc: 'Software, digital services, gov IT' },
  { name: 'Textiles & Trade', href: '/sectors/textiles', icon: '\u2756', desc: 'Garments, fabric, home textiles' },
  { name: 'Agriculture', href: '/sectors/agriculture', icon: '\u2618', desc: 'Farming, organic food, processing' },
  { name: 'Pharmaceuticals', href: '/sectors/pharmaceuticals', icon: '\u2624', desc: 'Medicine production, supply chains' },
  { name: 'divider' as const, href: '', icon: '', desc: '' },
  { name: 'Construction', href: '/sectors/construction', icon: '\u26E8', desc: 'Infrastructure, development, civil works' },
  { name: 'Engineering & Energy', href: '/sectors/engineering', icon: '\u2692', desc: 'HVAC, elevators, solar, power gen' },
  { name: 'Aviation & Charters', href: '/sectors/aviation', icon: '\u2708', desc: 'Private charter, executive transport' },
  { name: 'Human Resources', href: '/sectors/manpower', icon: '\u265F', desc: 'Manpower, recruitment, staffing' },
  { name: 'Tourism & Hospitality', href: '/sectors/tourism', icon: '\u26FA', desc: 'Hotels, travel, destination management' },
  { name: 'Luxury Car Rentals', href: '/sectors/luxury-rentals', icon: '\u2605', desc: 'Executive fleets, VIP transport' },
  { name: 'Education', href: '/sectors/education', icon: '\u270E', desc: 'Universities, EdTech, vocational' },
] as const

const SERVICES = [
  { name: 'Business Setup', href: '/services/business-setup', icon: '\u25C6', desc: 'UK & international company formation' },
  { name: 'Licensing & Compliance', href: '/services/licensing', icon: '\u25A0', desc: 'Regulatory & market-entry support' },
  { name: 'Import & Export', href: '/services/import-export', icon: '\u21C4', desc: 'International trade & logistics' },
  { name: 'Investor Protection', href: '/services/investor-protection', icon: '\u2605', desc: 'Due diligence, risk & compliance' },
  { name: 'Investment Advisory', href: '/services/investment-advisory', icon: '$', desc: 'Global opportunities & strategy' },
  { name: 'Partnership Development', href: '/services/partnership-development', icon: '+', desc: 'International strategic partnerships' },
  { name: 'divider' as const, href: '', icon: '', desc: '' },
  { name: 'Government Contracts', href: '/services/government', icon: '\u25A0', desc: 'Public-sector opportunities & procurement' },
  { name: 'Security Services', href: '/services/security', icon: '\u2605', desc: 'Corporate, asset & project protection' },
  { name: 'Payment Solutions', href: '/services/payment-solutions', icon: '\u25C6', desc: 'Cross-border & multi-currency solutions' },
  { name: 'Investment Migration', href: '/services/investment-migration', icon: '\u2708', desc: 'Global residency & investment programmes' },
] as const

const ABOUT_LINKS = [
  { label: 'About CZAAH', href: '/about', icon: '\u25C6', desc: 'Mission, structure, values' },
  { label: 'Our Team', href: '/team', icon: '\u265F', desc: 'Leadership & management' },
] as const

// ---------------------------------------------------------------------------
// Markhor SVG Logo
// ---------------------------------------------------------------------------

function MarkhorMark() {
  return (
    <svg className="markhor-mark" viewBox="-5 -12 100 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="navHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8a6f2e"/>
          <stop offset="40%" stopColor="#c9a84c"/>
          <stop offset="60%" stopColor="#e8c97a"/>
          <stop offset="100%" stopColor="#8a6f2e"/>
        </linearGradient>
        <linearGradient id="navBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c9a84c"/>
          <stop offset="100%" stopColor="#8a6f2e"/>
        </linearGradient>
      </defs>
      <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#navHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#navHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#navHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#navHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#navBodyGrad)" opacity="0.9"/>
      <path d="M 42 64 C 41 70, 40 76, 41 82" stroke="url(#navHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
      <path d="M 45 65 C 45 72, 45 78, 45 84" stroke="url(#navHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55"/>
      <path d="M 48 64 C 49 70, 50 76, 49 82" stroke="url(#navHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
      <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
      <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
      <path d="M 38 58 C 36 66, 35 76, 38 86 C 40 90, 50 90, 52 86 C 55 76, 54 66, 52 58" fill="url(#navBodyGrad)" opacity="0.5"/>
      <line x1="35" y1="108" x2="55" y2="108" stroke="url(#navHornGrad)" strokeWidth="1.5" opacity="0.7"/>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

// Lazy supabase client to avoid build-time initialization
let _supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabaseClient() {
  if (!_supabaseClient) _supabaseClient = createClient()
  return _supabaseClient
}

export function Navbar() {
  const supabaseClient = getSupabaseClient()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)

  // ---- Ctrl+K / Cmd+K to open search ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ---- Scroll effect ----
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ---- Auth: subscribe once ----
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('role, avatar_url')
          .eq('id', session.user.id)
          .single()
        setUserRole(profile?.role ?? null)
        if (profile?.avatar_url) {
          const { data: signedData } = await supabaseClient.storage
            .from('platform-files')
            .createSignedUrl(profile.avatar_url, 3600)
          setAvatarUrl(signedData?.signedUrl ?? null)
        } else {
          setAvatarUrl(null)
        }
      } else {
        setUserRole(null)
        setAvatarUrl(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ---- Auth: re-check on every navigation ----
  useEffect(() => {
    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('role, avatar_url')
          .eq('id', session.user.id)
          .single()
        setUserRole(profile?.role ?? null)
        if (profile?.avatar_url) {
          const { data: signedData } = await supabaseClient.storage
            .from('platform-files')
            .createSignedUrl(profile.avatar_url, 3600)
          setAvatarUrl(signedData?.signedUrl ?? null)
        } else {
          setAvatarUrl(null)
        }
      } else {
        setUserRole(null)
        setAvatarUrl(null)
      }
    })
  }, [pathname])

  // ---- Close mobile on route change ----
  useEffect(() => {
    setMobileOpen(false)
    setUserDropdownOpen(false)
  }, [pathname])

  // ---- Lock body scroll when mobile drawer is open ----
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // ---- Close user dropdown on outside click ----
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userDropdownOpen])

  const handleSignOut = useCallback(async () => {
    // Sign out client-side first
    await supabaseClient.auth.signOut()
    // Then hit the server route to clear cookies and redirect
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }, [])

  const userInitial = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string)[0].toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), [])

  // ---- Render helpers ----
  function renderDropdownItem(href: string, icon: string, name: string, desc: string) {
    return (
      <Link key={href} href={href}>
        <span className="dd-icon">{icon}</span>
        <span className="dd-text">
          <span>{name}</span>
          <small>{desc}</small>
        </span>
      </Link>
    )
  }

  // ---- Render ----
  return (
    <>
      <nav className={scrolled ? 'scrolled' : ''}>
        {/* ---- Logo ---- */}
        <Link href="/" className="nav-logo">
          <MarkhorMark />
          <div className="nav-divider"></div>
          <span className="nav-wordmark">CZAAH</span>
        </Link>

        {/* ---- Nav Links ---- */}
        <ul className="nav-links">
          <li><Link href="/">Home</Link></li>

          {/* Sectors dropdown */}
          <li>
            <span className="nav-dropdown-trigger">Sectors <span className="chevron">&#9660;</span></span>
            <div className="nav-dropdown">
              {SECTORS.map((sector, i) =>
                sector.name === 'divider' ? (
                  <div key={`div-${i}`} className="dd-divider"></div>
                ) : (
                  renderDropdownItem(sector.href, sector.icon, sector.name, sector.desc)
                )
              )}
            </div>
          </li>

          {/* Services dropdown */}
          <li>
            <span className="nav-dropdown-trigger">Services <span className="chevron">&#9660;</span></span>
            <div className="nav-dropdown">
              {SERVICES.map((service, i) =>
                service.name === 'divider' ? (
                  <div key={`div-${i}`} className="dd-divider"></div>
                ) : (
                  renderDropdownItem(service.href, service.icon, service.name, service.desc)
                )
              )}
            </div>
          </li>

          <li><Link href="/investments">Investments</Link></li>
          <li><Link href="/insights">Insights</Link></li>

          {/* About dropdown */}
          <li>
            <span className="nav-dropdown-trigger">About <span className="chevron">&#9660;</span></span>
            <div className="nav-dropdown nav-dropdown-sm">
              {ABOUT_LINKS.map((link) =>
                renderDropdownItem(link.href, link.icon, link.label, link.desc)
              )}
            </div>
          </li>

          <li><Link href="/contact">Contact</Link></li>
        </ul>

        {/* ---- Right side: CTA or User avatar ---- */}
        {user ? (
          <div ref={userDropdownRef} className="nav-user-menu" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setSearchOpen(true)}
              className="nav-search-btn"
              aria-label="Search"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s ease' }}>
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <LanguageSwitcher />
            <NotificationBell />
            <button
              className="nav-user-avatar"
              onClick={() => setUserDropdownOpen((v) => !v)}
              aria-label="User menu"
              style={avatarUrl ? { padding: 0, overflow: 'hidden' } : undefined}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                userInitial
              )}
            </button>
            {userDropdownOpen && (
              <div className="nav-user-dropdown">
                {(userRole === 'super_admin' || userRole === 'admin') && (
                  <Link href="/admin" onClick={() => setUserDropdownOpen(false)}>Super Admin</Link>
                )}
                {userRole === 'investment_partner' ? (
                  <Link href="/partner" onClick={() => setUserDropdownOpen(false)}>Partner Portal</Link>
                ) : userRole === 'partner' ? (
                  <Link href="/partner-network" onClick={() => setUserDropdownOpen(false)}>Partner Network</Link>
                ) : (
                  <>
                    <Link href="/dashboard" onClick={() => setUserDropdownOpen(false)}>My Dashboard</Link>
                    {userRole === 'real_estate_partner' && (
                      <Link href="/dashboard/properties" onClick={() => setUserDropdownOpen(false)}>My Properties</Link>
                    )}
                    {(userRole === 'admin' || userRole === 'super_admin') && (
                      <Link href="/partner" onClick={() => setUserDropdownOpen(false)}>Submit Deal</Link>
                    )}
                  </>
                )}
                <Link href="/dashboard/enquiries/new" onClick={() => setUserDropdownOpen(false)}>New Enquiry</Link>
                <button onClick={handleSignOut}>Sign Out</button>
              </div>
            )}
          </div>
        ) : (
          <div className="nav-auth-buttons">
            <LanguageSwitcher />
            <Link href="/login" className="nav-login-btn">Member Login</Link>
            <Link href="/contact" className="nav-cta">Schedule a Consultation</Link>
          </div>
        )}

        {/* ---- Hamburger (mobile) ---- */}
        <button
          className={`nav-hamburger${mobileOpen ? ' active' : ''}`}
          onClick={toggleMobile}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      {/* ---- Mobile Backdrop ---- */}
      {mobileOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={toggleMobile}
        />
      )}

      {/* ---- Mobile Sidebar Panel ---- */}
      <div className={`mobile-drawer${mobileOpen ? ' active' : ''}`} id="mobileDrawer">
        {/* Top: Home link */}
        <Link href="/" className="mobile-drawer-home">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>home</span>
          Home
        </Link>

        {/* Accordion sections */}
        <div className="mobile-accordion">
          {/* Sectors */}
          <button
            className={`mobile-accordion-trigger${mobileAccordion === 'sectors' ? ' open' : ''}`}
            onClick={() => setMobileAccordion(mobileAccordion === 'sectors' ? null : 'sectors')}
          >
            <span>Sectors</span>
            <span className="material-symbols-outlined mobile-accordion-icon">{mobileAccordion === 'sectors' ? 'remove' : 'add'}</span>
          </button>
          {mobileAccordion === 'sectors' && (
            <div className="mobile-accordion-content">
              {SECTORS.filter((s) => s.name !== 'divider').map((s) => (
                <Link key={s.href} href={s.href}>{s.name}</Link>
              ))}
            </div>
          )}

          {/* Services */}
          <button
            className={`mobile-accordion-trigger${mobileAccordion === 'services' ? ' open' : ''}`}
            onClick={() => setMobileAccordion(mobileAccordion === 'services' ? null : 'services')}
          >
            <span>Services</span>
            <span className="material-symbols-outlined mobile-accordion-icon">{mobileAccordion === 'services' ? 'remove' : 'add'}</span>
          </button>
          {mobileAccordion === 'services' && (
            <div className="mobile-accordion-content">
              {SERVICES.filter((s) => s.name !== 'divider').map((s) => (
                <Link key={s.href} href={s.href}>{s.name}</Link>
              ))}
            </div>
          )}

          {/* Company links (direct, no accordion) */}
          <Link href="/investments" className="mobile-accordion-trigger" style={{ cursor: 'pointer' }}>
            <span>Investments</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', opacity: 0.3 }}>east</span>
          </Link>
          <Link href="/insights" className="mobile-accordion-trigger" style={{ cursor: 'pointer' }}>
            <span>Insights</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', opacity: 0.3 }}>east</span>
          </Link>

          {/* About */}
          <button
            className={`mobile-accordion-trigger${mobileAccordion === 'about' ? ' open' : ''}`}
            onClick={() => setMobileAccordion(mobileAccordion === 'about' ? null : 'about')}
          >
            <span>About</span>
            <span className="material-symbols-outlined mobile-accordion-icon">{mobileAccordion === 'about' ? 'remove' : 'add'}</span>
          </button>
          {mobileAccordion === 'about' && (
            <div className="mobile-accordion-content">
              <Link href="/about">About CZAAH</Link>
              <Link href="/team">Our Team</Link>
              <Link href="/process">How It Works</Link>
              <Link href="/faq">FAQs</Link>
            </div>
          )}

          <Link href="/contact" className="mobile-accordion-trigger" style={{ cursor: 'pointer' }}>
            <span>Contact</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', opacity: 0.3 }}>east</span>
          </Link>
        </div>

        {/* Bottom: CTAs */}
        <div className="mobile-drawer-bottom">
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <NotificationBell />
                <span className="raleway-text" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', textTransform: 'uppercase' }}>Notifications</span>
              </div>
              {userRole === 'investment_partner' ? (
                <Link href="/partner" className="mobile-nav-cta">Partner Portal</Link>
              ) : userRole === 'partner' ? (
                <Link href="/partner-network" className="mobile-nav-cta">Partner Network</Link>
              ) : (
                <>
                  <Link href="/dashboard" className="mobile-nav-cta">My Dashboard</Link>
                  {(userRole === 'admin' || userRole === 'super_admin') && (
                    <Link href="/partner" className="mobile-nav-cta mobile-nav-cta-outline">Submit Deal</Link>
                  )}
                </>
              )}
              {(userRole === 'super_admin' || userRole === 'admin') && (
                <Link href="/admin" className="mobile-nav-cta mobile-nav-cta-outline">Super Admin</Link>
              )}
              <button
                onClick={handleSignOut}
                className="mobile-nav-cta mobile-nav-cta-outline"
                style={{ color: '#e6c364' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="mobile-nav-cta">Member Login</Link>
            </>
          )}
        </div>
      </div>

      {/* ---- Search Overlay ---- */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
