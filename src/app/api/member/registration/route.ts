import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

const REGISTRY_TABLE: Record<string, string> = {
  worker: 'workforce_registry',
  employer: 'employer_registry',
  oep_partner: 'oep_registry',
}

export async function GET(request: NextRequest) {
  try {
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    const table = profile ? REGISTRY_TABLE[profile.role] : undefined
    if (!profile || !table) {
      return NextResponse.json({ error: 'Not applicable to this account' }, { status: 403 })
    }

    const { data: registration } = await supabase
      .from(table)
      .select('*')
      .eq('profile_id', user.id)
      .single()

    return NextResponse.json({
      role: profile.role,
      kycStatus: profile.status,
      registration: registration || null,
    })
  } catch (err) {
    console.error('GET /api/member/registration error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
