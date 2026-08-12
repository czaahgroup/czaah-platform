import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

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

    // Verify super_admin role
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = request.nextUrl.searchParams.get('role')
    const status = request.nextUrl.searchParams.get('status')
    const search = request.nextUrl.searchParams.get('search')

    let query = adminClient
      .from('profiles')
      .select('id, full_name, email, company_name, role, status, phone, country, industry_interests, company_website, company_description, company_registration_number, avatar_url, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (role) {
      query = query.eq('role', role)
    }

    if (status === 'pending') {
      query = query.eq('status', 'pending_kyc_review')
    } else if (status === 'deactivated') {
      query = query.eq('status', 'deactivated')
    } else if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Users fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also fetch sectors and sector assignments for admin management
    const [sectorsRes, assignmentsRes] = await Promise.all([
      adminClient.from('sectors').select('id, name').eq('is_active', true).order('display_order'),
      adminClient.from('admin_sector_assignments').select('id, admin_id, sector_id'),
    ])

    return NextResponse.json({
      users: data || [],
      sectors: sectorsRes.data || [],
      sectorAssignments: assignmentsRes.data || [],
    })
  } catch (err) {
    console.error('Users API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role, status } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Prevent modifying super_admin users
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (targetProfile?.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot modify super_admin users' }, { status: 403 })
    }

    const updates: Record<string, string> = {}
    if (role && (role === 'member' || role === 'admin' || role === 'investment_partner' || role === 'elite_member' || role === 'real_estate_partner')) {
      updates.role = role
    }
    if (status) {
      updates.status = status
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (error) {
      console.error('User update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Users PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
