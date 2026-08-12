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

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'

    const supabase = createAdminClient()

    let query = supabase
      .from('call_log')
      .select(`
        *,
        caller:profiles!call_log_caller_id_fkey(id, full_name, role),
        receiver:profiles!call_log_receiver_id_fkey(id, full_name, role)
      `)
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter === 'missed') {
      query = query.in('status', ['missed', 'declined'])
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch call history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('GET /api/calls/history error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
