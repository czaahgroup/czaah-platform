import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, safeTerm } from '@/lib/crmAuth'
import { logError } from '@/lib/logError'

/** GET /api/construction/lookup?q= — companies, deals and staff for the project form */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const q = safeTerm(request.nextUrl.searchParams.get('q'))
    const db = access.supabase
    let cos = db.from('crm_companies').select('id, name').order('name').limit(50)
    let deals = db.from('deals').select('id, reference, title').order('created_at', { ascending: false }).limit(50)
    if (q) { cos = cos.ilike('name', `%${q}%`); deals = deals.ilike('title', `%${q}%`) }
    const [companies, dealRows, staff] = await Promise.all([
      cos, deals,
      db.from('profiles').select('id, full_name').in('role', ['admin', 'super_admin']).order('full_name'),
    ])
    return NextResponse.json({
      companies: companies.data || [],
      deals: dealRows.data || [],
      staff: staff.data || [],
    })
  } catch (err) {
    logError('api.construction.lookup.get', err)
    return NextResponse.json({ error: 'Could not load lookup data.' }, { status: 500 })
  }
}
