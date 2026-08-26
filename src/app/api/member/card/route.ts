import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('id, full_name, company_name, role, status, created_at')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.status !== 'approved') {
      return NextResponse.json({ error: 'Membership not approved' }, { status: 403 })
    }

    const memberId = profile.id.replace(/-/g, '').substring(0, 8).toUpperCase()

    const createdDate = new Date(profile.created_at)
    const memberSince = createdDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://czaah.com'
    const qrData = `${baseUrl}/verify/member/${profile.id}`

    return NextResponse.json({
      fullName: profile.full_name,
      email: user.email,
      companyName: profile.company_name || '',
      role: profile.role,
      memberId,
      memberSince,
      qrData,
    })
  } catch (err) {
    console.error('Member card API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
