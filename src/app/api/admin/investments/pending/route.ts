import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


function getAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getAuthClient(request)
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

    // Fetch all deals with pending approval
    const { data: deals, error } = await adminClient
      .from('investment_opportunities')
      .select('id, title, sector_tag, description, min_investment_amount, currency, target_return, investment_timeline, location, key_highlights, status, approval_status, submitted_by, created_at, updated_at')
      .eq('approval_status', 'pending_approval')
      .order('created_at', { ascending: false })

    if (error) {
      logError("api.admin.investments.pending", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch profile info for all submitted_by users
    const submitterIds = [...new Set((deals || []).map((d) => d.submitted_by).filter(Boolean))]
    let submitters: Record<string, { full_name: string; email: string; company_name: string | null }> = {}

    if (submitterIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, email, company_name')
        .in('id', submitterIds)

      if (profiles) {
        submitters = Object.fromEntries(
          profiles.map((p) => [p.id, { full_name: p.full_name, email: p.email, company_name: p.company_name }])
        )
      }
    }

    // Attach submitter info to each deal
    const enrichedDeals = (deals || []).map((deal) => ({
      ...deal,
      submitter: submitters[deal.submitted_by] || null,
    }))

    return NextResponse.json(enrichedDeals)
  } catch (err) {
    logError("api.admin.investments.pending", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
