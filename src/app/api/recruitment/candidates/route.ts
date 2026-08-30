import { NextRequest, NextResponse } from 'next/server'
import { requireRecruitAccess, safeTerm } from '@/lib/recruitAuth'
import { logError } from '@/lib/logError'

/**
 * GET /api/recruitment/candidates
 *   ?q=&trade=&status=&excludeOrder=<uuid>   — pick candidates for a job order
 */
export async function GET(request: NextRequest) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  try {
    const p = request.nextUrl.searchParams
    const q = safeTerm(p.get('q'))
    const trade = safeTerm(p.get('trade'))
    const status = p.get('status')
    const excludeOrder = p.get('excludeOrder')

    let query = access.supabase
      .from('workforce_registry')
      .select('id, full_name, nationality, current_location, trade_category, specific_role, years_experience, availability, passport_status, status')
      .order('created_at', { ascending: false })
      .limit(40)

    if (q) query = query.or(`full_name.ilike.%${q}%,specific_role.ilike.%${q}%,trade_category.ilike.%${q}%`)
    if (trade) query = query.ilike('trade_category', `%${trade}%`)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    let rows = data || []
    if (excludeOrder) {
      const { data: taken } = await access.supabase
        .from('recruitment_placements').select('candidate_id').eq('job_order_id', excludeOrder)
      const takenSet = new Set((taken || []).map((t) => t.candidate_id))
      rows = rows.filter((r) => !takenSet.has(r.id))
    }
    return NextResponse.json({ data: rows })
  } catch (err) {
    logError('api.recruitment.candidates.get', err)
    return NextResponse.json({ error: 'Could not load candidates.' }, { status: 500 })
  }
}
