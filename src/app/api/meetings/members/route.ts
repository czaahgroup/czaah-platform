import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'


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

// List of approved profiles for the meeting-participant picker. Uses the
// admin client because `profiles` RLS only lets a user read their own row,
// which otherwise left every non-admin seeing "No members found" here.
export async function GET(request: NextRequest) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data: profiles, error: queryError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('status', 'approved')
      .neq('id', user.id)
      .order('full_name')

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({ data: profiles || [] })
  } catch (err) {
    console.error('GET /api/meetings/members error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
