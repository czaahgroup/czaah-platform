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

    // Fetch all in parallel
    const [adminsRes, sectorsRes, assignmentsRes, partnersRes] = await Promise.all([
      adminClient
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'admin'),
      adminClient
        .from('sectors')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order'),
      adminClient
        .from('admin_sector_assignments')
        .select('admin_id, sector_id'),
      // Partner Network partners, so a sector specialist (e.g. Minerals &
      // Mining) can be handed an enquiry the same way an admin can.
      adminClient
        .from('partners')
        .select('profile_id, profiles!partners_profile_id_fkey(full_name, email), partner_sector_access(sector_id)')
        .eq('status', 'active'),
    ])

    const partners = (partnersRes.data || []).map((p) => ({
      id: p.profile_id,
      full_name: p.profiles?.full_name || 'Unknown',
      email: p.profiles?.email || '',
    }))
    const partnerSectorAssignments = (partnersRes.data || []).flatMap((p) =>
      (p.partner_sector_access || []).map((a: { sector_id: string }) => ({ admin_id: p.profile_id, sector_id: a.sector_id }))
    )

    return NextResponse.json({
      admins: adminsRes.data || [],
      sectors: sectorsRes.data || [],
      sectorAssignments: assignmentsRes.data || [],
      partners,
      partnerSectorAssignments,
    })
  } catch (err) {
    logError("api.admin.lookup", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
