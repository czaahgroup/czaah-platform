import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Gate for /api/portal/* — any signed-in user. The portal only ever
 * returns rows the caller has an explicit portal_shares grant for, so
 * there is no role requirement beyond being authenticated.
 *
 * Returns the service-role client plus the caller's id; routes must
 * filter every query by portal_shares.profile_id = userId themselves.
 */
export async function requirePortalUser(request: NextRequest) {
  const userClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { supabase: createAdminClient(), userId: user.id }
}

export const PORTAL_TYPES = ['deal', 'construction_project', 'commodity_trade'] as const
export type PortalType = (typeof PORTAL_TYPES)[number]

/** Table + display-safe column list for each shareable resource. */
export const PORTAL_SOURCES: Record<PortalType, { table: string; columns: string; label: string }> = {
  deal: {
    table: 'deals',
    columns: 'id, reference, title, kind, stage, value_amount, agreed_amount, currency, expected_close, closed_at, description, created_at',
    label: 'Deal',
  },
  construction_project: {
    table: 'construction_projects',
    columns: 'id, reference, name, project_type, status, progress_pct, site_location, start_date, target_completion, actual_completion, description, created_at',
    label: 'Project',
  },
  commodity_trade: {
    table: 'commodity_trades',
    columns: 'id, reference, title, desk, side, status, commodity, grade, quantity, quantity_unit, incoterm, load_port, discharge_port, laycan_start, laycan_end, created_at',
    label: 'Trade',
  },
}
