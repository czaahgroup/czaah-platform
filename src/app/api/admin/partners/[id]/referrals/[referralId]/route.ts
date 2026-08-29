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

// Only Super Admin can change or remove a partner referral connection —
// this is the only place in the app that ever mutates partner_referrals
// beyond its creation at registration.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; referralId: string }> }) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error
    const supabase = auth.supabase!
    const { id, referralId } = await params

    const { data: referral } = await supabase
      .from('partner_referrals')
      .select('id, partner_id, referred_profile_id')
      .eq('id', referralId)
      .eq('partner_id', id)
      .single()

    if (!referral) return NextResponse.json({ error: 'Referral not found' }, { status: 404 })

    const { error } = await supabase.from('partner_referrals').delete().eq('id', referralId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'partner_referral_removed',
      target_type: 'partner',
      target_id: id,
      metadata: { referral_id: referralId, referred_profile_id: referral.referred_profile_id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/partners/[id]/referrals/[referralId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
