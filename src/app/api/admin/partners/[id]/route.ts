import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

function createAuthClient(request: NextRequest) {
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

async function requireSuperAdmin(request: NextRequest) {
  const userClient = createAuthClient(request)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase, userId: user.id }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error
    const { id } = await params

    const { data: partner, error } = await auth.supabase!
      .from('partners')
      .select('*, profiles!partners_profile_id_fkey(full_name, email, phone, company_name), partner_sector_access(sector_id, sectors(id, name))')
      .eq('id', id)
      .single()

    if (error || !partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })

    const { data: referrals } = await auth.supabase!
      .from('partner_referrals')
      .select('*, profiles!partner_referrals_referred_profile_id_fkey(full_name, email, role)')
      .eq('partner_id', id)
      .order('created_at', { ascending: false })

    const { data: opportunities } = await auth.supabase!
      .from('partner_opportunities')
      .select('status')
      .eq('partner_id', id)

    const opportunityCounts = {
      total: opportunities?.length || 0,
      underReview: opportunities?.filter((o) => o.status === 'submitted' || o.status === 'more_info_required').length || 0,
      approved: opportunities?.filter((o) => o.status === 'approved').length || 0,
      inProgress: opportunities?.filter((o) => o.status === 'in_progress').length || 0,
      completed: opportunities?.filter((o) => o.status === 'completed').length || 0,
    }

    return NextResponse.json({ data: partner, referrals: referrals || [], opportunityCounts })
  } catch (err) {
    console.error('GET /api/admin/partners/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error
    const { id } = await params
    const supabase = auth.supabase!

    const body = await request.json()
    const { status, notes, sectorIds } = body

    const updates: Record<string, unknown> = {}
    if (status !== undefined) {
      if (!['active', 'suspended'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = status
    }
    if (notes !== undefined) updates.notes = notes

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      const { error } = await supabase.from('partners').update(updates).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      if (status !== undefined) {
        await supabase.from('audit_log').insert({
          actor_id: auth.userId,
          action: status === 'suspended' ? 'partner_suspended' : 'partner_reactivated',
          target_type: 'partner',
          target_id: id,
        })
      }
    }

    if (Array.isArray(sectorIds)) {
      await supabase.from('audit_log').insert({
        actor_id: auth.userId,
        action: 'partner_sectors_updated',
        target_type: 'partner',
        target_id: id,
        metadata: { sectorIds },
      })
      await supabase.from('partner_sector_access').delete().eq('partner_id', id)
      if (sectorIds.length > 0) {
        const rows = sectorIds.map((sectorId: string) => ({ partner_id: id, sector_id: sectorId }))
        const { error: sectorError } = await supabase.from('partner_sector_access').insert(rows)
        if (sectorError) return NextResponse.json({ error: sectorError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/admin/partners/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
