import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/rateLimit'


export async function POST(request: NextRequest) {
  // Rate limit: 10 per minute per IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`signout:${ip}`, 10, 60000)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  // 303 forces the browser to follow up with GET — the POST from the sign-out
  // form must not be replayed against /login (a static asset on Cloudflare Pages
  // that only serves GET; a preserved-method 307 there fails outright).
  const response = NextResponse.redirect(new URL('/login', request.url), 303)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.signOut()

  // Explicitly clear all Supabase auth cookies
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
    }
  })

  return response
}
