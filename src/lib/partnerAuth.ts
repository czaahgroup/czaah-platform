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
