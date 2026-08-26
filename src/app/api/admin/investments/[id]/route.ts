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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const { data, error } = await auth.adminClient
      .from('investment_opportunities')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Fetch documents
    const { data: documents } = await auth.adminClient
      .from('investment_documents')
      .select('id, document_type, file_url, file_name, uploaded_at')
      .eq('opportunity_id', id)
      .order('uploaded_at', { ascending: false })

    return NextResponse.json({ ...data, documents: documents || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const allowed = [
      'title', 'sector_tag', 'description', 'min_investment_amount',
      'currency', 'target_return', 'investment_timeline', 'location',
      'key_highlights', 'status',
    ]
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    // If publishing, set published_at
    if (body.status === 'published' || body.status === 'closing_soon') {
      const { data: current } = await auth.adminClient
        .from('investment_opportunities')
        .select('published_at')
        .eq('id', id)
        .single()

      if (!current?.published_at) {
        updates.published_at = new Date().toISOString()
      }
    }

    const { data, error } = await auth.adminClient
      .from('investment_opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const { error } = await auth.adminClient
      .from('investment_opportunities')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
