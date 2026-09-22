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
 * Authenticates the caller and confirms they are an admin.
 *
 * Same shape as requirePartner in partnerAuth.ts: either `{ error }` to
 * return straight from the route, or `{ supabase, userId, role }`. The
 * service-role client is only handed back once that check has passed, so a
 * route cannot accidentally use it before authorising.
 */
export async function requireAdmin(request: NextRequest) {
  const userClient = createAuthClient(request)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, userId: user.id, role: profile.role as 'admin' | 'super_admin' }
}
