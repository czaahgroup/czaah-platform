import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


export async function GET(request: NextRequest) {
  try {
    // Create server client from request cookies to verify caller
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify super_admin role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get filter from query params
    const filter = request.nextUrl.searchParams.get('filter') || 'pending'

    let query = adminClient
      .from('profiles')
      .select(`
        id, full_name, email, company_name, country, role, status, created_at,
        kyc_documents!user_id (id, document_type, file_url, review_status)
      `)
      .neq('role', 'super_admin')
      .order('created_at', { ascending: false })

    if (filter === 'pending') {
      query = query.eq('status', 'pending_kyc_review')
    } else if (filter === 'approved') {
      query = query.eq('status', 'approved')
    } else if (filter === 'rejected') {
      query = query.eq('status', 'rejected')
    }

    const { data, error } = await query

    if (error) {
      logError("api.admin.kyc", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    logError("api.admin.kyc", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
