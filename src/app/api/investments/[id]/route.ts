import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Fetch the investment (only published or closing_soon for members)
    const { data: investment, error: invError } = await adminClient
      .from('investment_opportunities')
      .select('*')
      .eq('id', id)
      .in('status', ['published', 'closing_soon'])
      .single()

    if (invError || !investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
    }

    // Fetch documents count
    const { count: documentsCount } = await adminClient
      .from('investment_documents')
      .select('*', { count: 'exact', head: true })
      .eq('opportunity_id', id)

    // Fetch images
    const { data: images } = await adminClient
      .from('investment_images')
      .select('*')
      .eq('opportunity_id', id)
      .order('display_order', { ascending: true })

    return NextResponse.json({
      data: {
        ...investment,
        documents_count: documentsCount || 0,
        images: images || [],
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
