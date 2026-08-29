import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'


async function verifyAdmin(request: NextRequest) {
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
  if (!user) return null

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin' && profile?.role !== 'admin') return null
  return { user, adminClient }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = auth.adminClient
      .from('investment_opportunities')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const {
      title, sector_tag, description, min_investment_amount,
      currency, target_return, investment_timeline, location, key_highlights,
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data, error } = await auth.adminClient
      .from('investment_opportunities')
      .insert({
        title,
        sector_tag: sector_tag || null,
        description: description || null,
        min_investment_amount: min_investment_amount || null,
        currency: currency || 'USD',
        target_return: target_return || null,
        investment_timeline: investment_timeline || null,
        location: location || null,
        key_highlights: key_highlights || [],
        status: 'draft',
        created_by: auth.user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
