import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, safeTerm } from '@/lib/crmAuth'
import { logError } from '@/lib/logError'

/**
 * GET /api/deals/lookup?q=  — options for the deal form.
 * Returns properties, investment opportunities, companies and staff.
 * `q` narrows properties + investments + companies by title/name.
 */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const q = safeTerm(request.nextUrl.searchParams.get('q'))
    const db = access.supabase

    let props = db.from('property_listings').select('id, title, city').order('created_at', { ascending: false }).limit(50)
    let invs = db.from('investment_opportunities').select('id, title').order('created_at', { ascending: false }).limit(50)
    let cos = db.from('crm_companies').select('id, name').order('name').limit(50)
    if (q) {
      props = props.ilike('title', `%${q}%`)
      invs = invs.ilike('title', `%${q}%`)
      cos = cos.ilike('name', `%${q}%`)
    }
    const [properties, investments, companies, staff] = await Promise.all([
      props, invs, cos,
      db.from('profiles').select('id, full_name').in('role', ['admin', 'super_admin']).order('full_name'),
    ])
    return NextResponse.json({
      properties: properties.data || [],
      investments: investments.data || [],
      companies: companies.data || [],
      staff: staff.data || [],
    })
  } catch (err) {
    logError('api.deals.lookup.get', err)
    return NextResponse.json({ error: 'Could not load lookup data.' }, { status: 500 })
  }
}
