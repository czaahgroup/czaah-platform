import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


export async function GET(request: NextRequest) {
  try {
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin' && callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [
      { count: totalMembers },
      { count: pendingKYC },
      { count: totalEnquiries },
      { count: unassignedEnquiries },
      { count: activeEnquiries },
      { count: totalAdmins },
    ] = await Promise.all([
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'member'),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending_kyc_review').eq('role', 'member'),
      adminClient.from('enquiries').select('*', { count: 'exact', head: true }),
      adminClient.from('enquiries').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
      adminClient.from('enquiries').select('*', { count: 'exact', head: true }).in('status', ['assigned', 'active', 'waiting']),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    ])

    return NextResponse.json({
      totalMembers: totalMembers ?? 0,
      pendingKYC: pendingKYC ?? 0,
      totalEnquiries: totalEnquiries ?? 0,
      unassignedEnquiries: unassignedEnquiries ?? 0,
      activeEnquiries: activeEnquiries ?? 0,
      totalAdmins: totalAdmins ?? 0,
    })
  } catch (err) {
    logError('api.admin.overview', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
