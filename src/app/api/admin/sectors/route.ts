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

  if (profile?.role !== 'super_admin') return null
  return { user, adminClient }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await auth.adminClient
      .from('sectors')
      .select('*')
      .order('display_order', { ascending: true })

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
    const { name, slug, description, icon_url, image_url, display_order, is_active } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const { data, error } = await auth.adminClient
      .from('sectors')
      .insert({
        name,
        slug,
        description: description || null,
        icon_url: icon_url || null,
        image_url: image_url || null,
        display_order: display_order ?? 0,
        is_active: is_active ?? true,
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
