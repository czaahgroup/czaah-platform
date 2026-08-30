import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery, safeTerm } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const TYPES = ['residential', 'commercial', 'industrial', 'infrastructure', 'mixed_use', 'fit_out', 'other']
const STATUS = ['planning', 'tendering', 'awarded', 'in_progress', 'on_hold', 'completed', 'handover', 'cancelled']
const PAGE = 50

function makeRef() {
  const d = new Date()
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`
  return `CP-${ym}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

/** GET /api/construction/projects?status=&type=&country=&q=&page= */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const p = request.nextUrl.searchParams
    const status = p.get('status')
    const type = p.get('type')
    const country = p.get('country')
    const q = safeTerm(p.get('q'))
    const page = Math.max(0, parseInt(p.get('page') || '0', 10))

    let query = access.supabase
      .from('construction_projects')
      .select('id, reference, name, project_type, status, progress_pct, site_location, country, contract_value, currency, start_date, target_completion, created_at, client:crm_companies(id, name), milestones:construction_milestones(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    query = scopeQuery(query, access)
    if (status && STATUS.includes(status)) query = query.eq('status', status)
    if (type && TYPES.includes(type)) query = query.eq('project_type', type)
    if (country) query = query.eq('country', country.toUpperCase())
    if (q) query = query.or(`name.ilike.%${q}%,reference.ilike.%${q}%,site_location.ilike.%${q}%`)

    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({
      data: (data || []).map((r) => ({ ...r, milestoneCount: r.milestones?.[0]?.count ?? 0, milestones: undefined })),
      page, pageSize: PAGE, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * PAGE,
    })
  } catch (err) {
    logError('api.construction.projects.get', err)
    return NextResponse.json({ error: 'Could not load projects.' }, { status: 500 })
  }
}

/** POST /api/construction/projects */
export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const name = String(b.name || '').trim()
    if (!name) return NextResponse.json({ error: 'A project name is required.' }, { status: 400 })

    const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
    const row = {
      reference: makeRef(),
      name: name.slice(0, 300),
      project_type: TYPES.includes(b.projectType) ? b.projectType : 'other',
      status: STATUS.includes(b.status) ? b.status : 'planning',
      client_company_id: b.clientCompanyId || null,
      deal_id: b.dealId || null,
      site_location: b.siteLocation ? String(b.siteLocation).slice(0, 300) : null,
      country: b.country ? String(b.country).toUpperCase().slice(0, 2) : null,
      contract_value: num(b.contractValue),
      budget: num(b.budget),
      currency: b.currency ? String(b.currency).toUpperCase().slice(0, 3) : null,
      start_date: b.startDate || null,
      target_completion: b.targetCompletion || null,
      description: b.description ? String(b.description).slice(0, 8000) : null,
      owner_id: b.ownerId || access.userId,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('construction_projects').insert(row).select('id, reference').single()
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'construction_project.created', targetType: 'construction_project', targetId: data.id, metadata: { name, reference: data.reference } })
    return NextResponse.json({ data })
  } catch (err) {
    logError('api.construction.projects.post', err)
    return NextResponse.json({ error: 'Could not create the project.' }, { status: 500 })
  }
}
