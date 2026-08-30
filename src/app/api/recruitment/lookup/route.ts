import { NextRequest, NextResponse } from 'next/server'
import { requireRecruitAccess } from '@/lib/recruitAuth'
import { logError } from '@/lib/logError'

/** GET /api/recruitment/lookup — employers, OEPs and staff for the job-order form */
export async function GET(request: NextRequest) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  try {
    const [employers, oeps, staff] = await Promise.all([
      access.supabase.from('employer_registry').select('id, company_name').order('company_name').limit(500),
      access.supabase.from('oep_registry').select('id, company_name').order('company_name').limit(500),
      access.supabase.from('profiles').select('id, full_name').in('role', ['admin', 'super_admin']).order('full_name'),
    ])
    return NextResponse.json({
      employers: employers.data || [],
      oeps: oeps.data || [],
      staff: staff.data || [],
    })
  } catch (err) {
    logError('api.recruitment.lookup.get', err)
    return NextResponse.json({ error: 'Could not load lookup data.' }, { status: 500 })
  }
}
