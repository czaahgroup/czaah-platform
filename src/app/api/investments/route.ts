import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'


export async function GET(request: NextRequest) {
  try {
    // Authenticate user
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

    const adminClient = createAdminClient()

    // Verify member is approved
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Access denied. KYC approval required.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sector = searchParams.get('sector')
    const search = searchParams.get('search')

    let query = adminClient
      .from('investment_opportunities')
      .select('*')
      .in('status', ['published', 'closing_soon'])
      .order('published_at', { ascending: false })

    if (sector) {
      query = query.eq('sector_tag', sector)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,sector_tag.ilike.%${search}%,location.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
