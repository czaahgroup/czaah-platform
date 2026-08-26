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

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin' && callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all in parallel
    const [adminsRes, sectorsRes, assignmentsRes] = await Promise.all([
      adminClient
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'admin'),
      adminClient
        .from('sectors')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order'),
      adminClient
        .from('admin_sector_assignments')
        .select('admin_id, sector_id'),
    ])

    return NextResponse.json({
      admins: adminsRes.data || [],
      sectors: sectorsRes.data || [],
      sectorAssignments: assignmentsRes.data || [],
    })
  } catch (err) {
    console.error('Admin lookup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
