import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Access gate for /api/recruitment/* routes.
 *
 * The recruitment pipeline (job orders + placements) is an internal ops
 * tool — super_admin / admin only. Partners recommend candidates and
 * employers through the existing /api/partner/* submission routes.
 *
 * Returns the service-role client; routes do their own writes through it.
 */
export async function requireRecruitAccess(request: NextRequest) {
  const userClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase, userId: user.id, role: profile.role as 'super_admin' | 'admin' }
}

export type RecruitAccess = Exclude<Awaited<ReturnType<typeof requireRecruitAccess>>, { error: NextResponse }>

/** Same PostgREST-safe search sanitiser as crmAuth.safeTerm. */
export function safeTerm(raw: string | null | undefined): string {
  return String(raw || '').replace(/[^\p{L}\p{N}\s@._+-]/gu, '').trim().slice(0, 80)
}
