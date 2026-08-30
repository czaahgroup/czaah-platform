import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Access gate for /api/crm/* routes.
 *
 * - super_admin / admin  -> scope 'all'  (every record)
 * - partner              -> scope 'own'  (owner_id = them OR created_by = them,
 *                                         and for contacts, profile_id = them)
 * - anything else        -> 403
 *
 * Returns the service-role client; each route applies the scope itself.
 */
export async function requireCrmAccess(request: NextRequest) {
  const userClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  if (profile.role === 'super_admin' || profile.role === 'admin') {
    return { supabase, userId: user.id, role: profile.role, scope: 'all' as const }
  }
  if (profile.role === 'partner') {
    return { supabase, userId: user.id, role: profile.role, scope: 'own' as const }
  }
  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
}

export type CrmAccess = Exclude<Awaited<ReturnType<typeof requireCrmAccess>>, { error: NextResponse }>

/** Apply the caller's scope to a PostgREST query builder. `ownerCols` are the
 *  columns that count as "mine" for a partner (default owner_id + created_by). */
export function scopeQuery<T>(q: T, access: CrmAccess, ownerCols: string[] = ['owner_id', 'created_by']): T {
  if (access.scope === 'all') return q
  const ors = ownerCols.map((c) => `${c}.eq.${access.userId}`).join(',')
  // @ts-expect-error PostgREST builder .or() is chainable
  return q.or(ors)
}
