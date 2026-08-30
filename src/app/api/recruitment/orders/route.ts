import { NextRequest, NextResponse } from 'next/server'
import { requireRecruitAccess, safeTerm } from '@/lib/recruitAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const ORDER_STATUS = ['draft', 'open', 'partially_filled', 'filled', 'on_hold', 'closed', 'cancelled']
const PAGE = 50

function makeRef() {
  const d = new Date()
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `JO-${ym}-${rand}`
}

/**
 * GET /api/recruitment/orders
 *   ?status=&country=<ISO2>&trade=&q=&page=
 */
export async function GET(request: NextRequest) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  try {
    const p = request.nextUrl.searchParams
    const status = p.get('status')
    const country = p.get('country')
    const trade = safeTerm(p.get('trade'))
    const q = safeTerm(p.get('q'))
    const page = Math.max(0, parseInt(p.get('page') || '0', 10))

    let query = access.supabase
      .from('recruitment_job_orders')
      .select('id, reference, title, trade_category, specific_role, destination_country, headcount, status, target_date, created_at, salary_min, salary_max, salary_currency, employer:employer_registry(id, company_name), oep:oep_registry(id, company_name), company:crm_companies(id, name), placements:recruitment_placements(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    if (status && ORDER_STATUS.includes(status)) query = query.eq('status', status)
    if (country) query = query.eq('destination_country', country.toUpperCase())
    if (trade) query = query.ilike('trade_category', `%${trade}%`)
    if (q) query = query.or(`title.ilike.%${q}%,reference.ilike.%${q}%,specific_role.ilike.%${q}%`)

    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({
      data: (data || []).map((o) => ({ ...o, candidateCount: o.placements?.[0]?.count ?? 0, placements: undefined })),
      page, pageSize: PAGE, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * PAGE,
    })
  } catch (err) {
    logError('api.recruitment.orders.get', err)
    return NextResponse.json({ error: 'Could not load job orders.' }, { status: 500 })
  }
}

/** POST /api/recruitment/orders */
export async function POST(request: NextRequest) {
  const access = await requireRecruitAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const title = String(b.title || '').trim()
    const trade = String(b.tradeCategory || '').trim()
    if (!title) return NextResponse.json({ error: 'A job title is required.' }, { status: 400 })
    if (!trade) return NextResponse.json({ error: 'A trade category is required.' }, { status: 400 })

    const headcount = Math.max(1, Math.min(100000, parseInt(b.headcount, 10) || 1))
    const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
    const row = {
      reference: makeRef(),
      title: title.slice(0, 300),
      employer_id: b.employerId || null,
      oep_id: b.oepId || null,
      company_id: b.companyId || null,
      trade_category: trade.slice(0, 120),
      specific_role: b.specificRole ? String(b.specificRole).slice(0, 200) : null,
      destination_country: b.destinationCountry ? String(b.destinationCountry).toUpperCase().slice(0, 2) : null,
      headcount,
      salary_min: num(b.salaryMin),
      salary_max: num(b.salaryMax),
      salary_currency: b.salaryCurrency ? String(b.salaryCurrency).toUpperCase().slice(0, 3) : null,
      contract_months: b.contractMonths ? Math.max(0, parseInt(b.contractMonths, 10) || 0) : null,
      requirements: b.requirements ? String(b.requirements).slice(0, 8000) : null,
      status: ORDER_STATUS.includes(b.status) ? b.status : 'open',
      target_date: b.targetDate || null,
      owner_id: b.ownerId || access.userId,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('recruitment_job_orders').insert(row).select('id, reference').single()
    if (error) throw error

    await logActivity({ actorId: access.userId, action: 'job_order.created', targetType: 'job_order', targetId: data.id, metadata: { title, reference: data.reference } })
    return NextResponse.json({ data })
  } catch (err) {
    logError('api.recruitment.orders.post', err)
    return NextResponse.json({ error: 'Could not create the job order.' }, { status: 500 })
  }
}
