import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery, safeTerm } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const STAGES = ['new', 'engaged', 'qualified', 'active', 'dormant', 'lost']
const ORG_TYPES = ['company', 'investor', 'partner_firm', 'government', 'fund', 'counterparty', 'other']
const PAGE = 50

export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const p = request.nextUrl.searchParams
    const stage = p.get('stage')
    const sectorId = p.get('sectorId')
    const orgType = p.get('orgType')
    const jurisdiction = p.get('jurisdiction')
    const q = safeTerm(p.get('q'))
    const page = Math.max(0, parseInt(p.get('page') || '0', 10))

    let query = access.supabase
      .from('crm_companies')
      .select('id, name, domain, website, country, company_size, stage, org_type, jurisdiction, kyc_status, created_at, sector:sectors(id, name), contacts:crm_contacts(count)', { count: 'exact' })
      .order('name', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    query = scopeQuery(query, access)
    if (stage && STAGES.includes(stage)) query = query.eq('stage', stage)
    if (sectorId) query = query.eq('sector_id', sectorId)
    if (orgType) query = query.eq('org_type', orgType)
    if (jurisdiction) query = query.eq('jurisdiction', jurisdiction.toUpperCase())
    if (q) query = query.or(`name.ilike.%${q}%,domain.ilike.%${q}%`)

    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({
      data: (data || []).map((c) => ({ ...c, contactCount: c.contacts?.[0]?.count ?? 0, contacts: undefined })),
      page, pageSize: PAGE, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * PAGE,
    })
  } catch (err) {
    logError('api.crm.companies.get', err)
    return NextResponse.json({ error: 'Could not load companies.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const name = String(b.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Company name is required.' }, { status: 400 })

    const { data: dup } = await access.supabase.from('crm_companies').select('id, name').ilike('name', name).maybeSingle()
    if (dup) return NextResponse.json({ error: `"${dup.name}" already exists.`, existingId: dup.id }, { status: 409 })

    const row = {
      name,
      domain: b.domain ? String(b.domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null,
      website: b.website ? String(b.website).trim() : null,
      sector_id: b.sectorId || null,
      country: b.country ? String(b.country).trim() : null,
      company_size: b.companySize ? String(b.companySize).slice(0, 20) : null,
      stage: STAGES.includes(b.stage) ? b.stage : 'new',
      org_type: ORG_TYPES.includes(b.orgType) ? b.orgType : 'company',
      registration_number: b.registrationNumber ? String(b.registrationNumber).slice(0, 100) : null,
      jurisdiction: b.jurisdiction ? String(b.jurisdiction).toUpperCase().slice(0, 2) : null,
      owner_id: b.ownerId || access.userId,
      description: b.description ? String(b.description).slice(0, 5000) : null,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('crm_companies').insert(row).select('id').single()
    if (error) throw error

    await logActivity({ actorId: access.userId, action: 'company.created', targetType: 'company', targetId: data.id, metadata: { name } })
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.crm.companies.post', err)
    return NextResponse.json({ error: 'Could not create the company.' }, { status: 500 })
  }
}
