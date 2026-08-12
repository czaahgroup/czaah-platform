import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

function getAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Verify user is elite_member or super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'elite_member' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all admin profiles (exclude super_admin — discreet role)
    const { data: admins, error: queryError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'admin')
      .eq('status', 'approved')
      .order('full_name')

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({ data: admins || [] })
  } catch (err) {
    console.error('GET /api/elite/admins error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
