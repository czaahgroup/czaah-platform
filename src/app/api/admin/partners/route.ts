import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error

    const { data: partners, error } = await auth.supabase!
      .from('partners')
      .select('*, profiles!partners_profile_id_fkey(full_name, email, phone, company_name), partner_sector_access(sector_id, sectors(id, name))')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: sectors } = await auth.supabase!
      .from('sectors')
      .select('id, name, is_active, display_order')
      .order('display_order', { ascending: true })

    return NextResponse.json({ data: partners, sectors: sectors || [] })
  } catch (err) {
    logError("api.admin.partners", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error
    const supabase = auth.supabase!

    const body = await request.json()
    const { email, fullName, companyName, sectorIds } = body

    if (!email || !fullName) {
      return NextResponse.json({ error: 'email and fullName are required' }, { status: 400 })
    }

    // Invite the auth user (Supabase sends the password-setup email).
    // Without redirectTo, Supabase falls back to the project's default
    // Site URL (the homepage) instead of the password-setup page.
    const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${new URL(request.url).origin}/api/auth/callback?redirect=${encodeURIComponent('/reset-password')}`,
    })
    if (inviteError || !invited?.user) {
      return NextResponse.json({ error: inviteError?.message || 'Failed to invite user' }, { status: 500 })
    }

    // Create the profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: invited.user.id,
      role: 'partner',
      status: 'approved',
      full_name: fullName,
      email,
      company_name: companyName || null,
    })

    if (profileError) {
      await supabase.auth.admin.deleteUser(invited.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Create the partners row
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .insert({ profile_id: invited.user.id, created_by: auth.userId })
      .select()
      .single()

    if (partnerError || !partner) {
      await supabase.auth.admin.deleteUser(invited.user.id)
      return NextResponse.json({ error: partnerError?.message || 'Failed to create partner record' }, { status: 500 })
    }

    // Create their private message inbox
    await supabase.from('partner_chats').insert({ partner_id: partner.id })

    // Assign authorised sectors
    if (Array.isArray(sectorIds) && sectorIds.length > 0) {
      const rows = sectorIds.map((sectorId: string) => ({ partner_id: partner.id, sector_id: sectorId }))
      await supabase.from('partner_sector_access').insert(rows)
    }

    await supabase.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'partner_created',
      target_type: 'partner',
      target_id: partner.id,
      metadata: { partner_id: partner.partner_id, email, fullName },
    })

    return NextResponse.json({ success: true, partner })
  } catch (err) {
    logError("api.admin.partners", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
