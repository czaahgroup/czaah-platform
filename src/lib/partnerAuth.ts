import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

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

/**
 * Authenticates the caller and resolves their `partners` row.
 * Used by every /api/partner/* route so a partner can only ever
 * touch data scoped to their own partner_id — never another partner's.
 */
export async function requirePartner(request: NextRequest) {
  const userClient = createAuthClient(request)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'partner') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const { data: partner } = await supabase.from('partners').select('*').eq('profile_id', user.id).single()
  if (!partner) {
    return { error: NextResponse.json({ error: 'Partner record not found' }, { status: 404 }) }
  }
  if (partner.status === 'suspended') {
    return { error: NextResponse.json({ error: 'This partner account has been suspended' }, { status: 403 }) }
  }

  return { supabase, userId: user.id, partner }
}

/**
 * True if this partner is authorised for a Human Resources / Workforce /
 * Recruitment sector — gates workforce, employer, and OEP submission,
 * both the nav link and (here) the actual API enforcement.
 */
export async function hasWorkforceSectorAccess(supabase: SupabaseClient, partnerId: string): Promise<boolean> {
  const { data: access } = await supabase
    .from('partner_sector_access')
    .select('sectors(name)')
    .eq('partner_id', partnerId)
  return (access || []).some((row: { sectors: { name: string } | null }) =>
    row.sectors && /human resources|workforce|recruitment/i.test(row.sectors.name)
  )
}
