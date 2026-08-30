import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // property.czaah.com is a separate, publicly-browsable property portal
  // (London/Dubai/Pakistan listings) backed by the same app — it lives
  // internally under /property-portal. A handful of paths (auth, contact,
  // APIs) are intentionally left un-rewritten so they keep hitting the
  // main site's existing pages/routes, shared across both domains.
  const host = request.headers.get('host') || ''
  if (host === 'property.czaah.com') {
    const { pathname } = request.nextUrl
    const sharedPaths = ['/login', '/register', '/reset-password', '/contact']
    const isShared = pathname.startsWith('/api/') || sharedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (!isShared && !pathname.startsWith('/property-portal')) {
      const url = request.nextUrl.clone()
      url.pathname = `/property-portal${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url)
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname



  // Public routes — no auth required
  const publicRoutes = ['/', '/about', '/contact', '/team', '/login', '/register', '/reset-password', '/process', '/insights', '/faq', '/privacy', '/terms', '/investments', '/webmail']
  const isPublicRoute = publicRoutes.some(route => pathname === route) ||
    // Webmail: the page authenticates itself via a per-mailbox password
    // session (not Supabase). All /api/mail/* routes call requireMailAccess,
    // which understands both the Supabase session and the webmail cookie.
    pathname.startsWith('/webmail') ||
    pathname.startsWith('/api/mail/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/sectors') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/property-portal') ||
    pathname.startsWith('/verify') ||
    pathname.startsWith('/api/public/') ||
    pathname === '/api/contact' ||
    // Meeting rooms allow guest join with no account, same as a Google
    // Meet link — the room page itself handles both a logged-in member
    // and a name-only guest.
    pathname.startsWith('/meet/')

  if (isPublicRoute) return supabaseResponse

  // Not logged in
  if (!user) {
    // API routes return 401 instead of redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // API routes — auth is verified above, skip profile checks (handled in route)
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // Get user profile for role/status checks
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  // No profile yet (just signed up) → redirect to pending
  if (!profile) {
    if (pathname !== '/pending') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
    return supabaseResponse
  }

  // Pending KYC / rejected / deactivated → can only see pending page
  if (profile.status !== 'approved') {
    if (pathname !== '/pending') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
    return supabaseResponse
  }

  // Role-based route protection
  // /admin — admin and super_admin only
  if (pathname.startsWith('/admin') && profile.role !== 'super_admin' && profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Super admin only pages within /admin
  const superAdminOnlyPaths = ['/admin/users', '/admin/settings', '/admin/audit-log', '/admin/content/sectors', '/admin/content/services', '/admin/content/products']
  if (profile.role === 'admin' && superAdminOnlyPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // /partner — investment_partner and super_admin only
  const isLegacyPartnerRoute = pathname === '/partner' || pathname.startsWith('/partner/')
  if (isLegacyPartnerRoute && profile.role !== 'investment_partner' && profile.role !== 'super_admin' && profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // /partner-network — CZAAH Partner Network, partner and super_admin only
  if (pathname.startsWith('/partner-network') && profile.role !== 'partner' && profile.role !== 'super_admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Partners have no account area under /dashboard — send them to their
  // actual portal instead of the generic member dashboard.
  if (pathname.startsWith('/dashboard') && profile.role === 'partner') {
    return NextResponse.redirect(new URL('/partner-network', request.url))
  }

  // Admin/super_admin's home is /admin — bounce bare /dashboard there so
  // there's a single landing portal instead of two competing ones.
  if (pathname === '/dashboard' && (profile.role === 'admin' || profile.role === 'super_admin')) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // /dashboard — approved members, admins, and investment partners
  // /sectors, /services, /investments — approved users
  // These are all allowed for approved users, no extra check needed

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|xml|mp4|woff2?|js)$).*)',
  ],
}
