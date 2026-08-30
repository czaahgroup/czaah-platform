import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery, safeTerm } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const KIND = ['property_sale', 'property_rental', 'investment', 'advisory', 'other']
const STAGE = ['lead', 'qualified', 'proposal', 'negotiation', 'due_diligence', 'agreement', 'closed_won', 'closed_lost']
const PAGE = 100

function makeRef() {
  const d = new Date()
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`
  return `DL-${ym}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

/** GET /api/deals?stage=&kind=&q=&view=open|all&page= */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const p = request.nextUrl.searchParams
    const stage = p.get('stage')
    const kind = p.get('kind')
    const view = p.get('view') || 'all'
    const q = safeTerm(p.get('q'))
    const page = Math.max(0, parseInt(p.get('page') || '0', 10))

    let query = access.supabase
      .from('deals')
      .select('id, reference, title, kind, stage, value_amount, agreed_amount, currency, probability, expected_close, closed_at, created_at, company:crm_companies(id, name), property:property_listings(id, title), investment:investment_opportunities(id, title), parties:deal_parties(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    query = scopeQuery(query, access)
    if (stage && STAGE.includes(stage)) query = query.eq('stage', stage)
    if (kind && KIND.includes(kind)) query = query.eq('kind', kind)
    if (view === 'open') query = query.not('stage', 'in', '(closed_won,closed_lost)')
    if (q) query = query.or(`title.ilike.%${q}%,reference.ilike.%${q}%`)

    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({
      data: (data || []).map((d) => ({ ...d, partyCount: d.parties?.[0]?.count ?? 0, parties: undefined })),
      page, pageSize: PAGE, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * PAGE,
    })
  } catch (err) {
    logError('api.deals.get', err)
    return NextResponse.json({ error: 'Could not load deals.' }, { status: 500 })
  }
}

/** POST /api/deals */
export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const title = String(b.title || '').trim()
    if (!title) return NextResponse.json({ error: 'A deal title is required.' }, { status: 400 })

    const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
    const row = {
      reference: makeRef(),
      title: title.slice(0, 300),
      kind: KIND.includes(b.kind) ? b.kind : 'other',
      stage: STAGE.includes(b.stage) ? b.stage : 'lead',
      property_id: b.propertyId || null,
      investment_id: b.investmentId || null,
      company_id: b.companyId || null,
      country: b.country ? String(b.country).toUpperCase().slice(0, 2) : null,
      value_amount: num(b.valueAmount),
      currency: b.currency ? String(b.currency).toUpperCase().slice(0, 3) : null,
      commission_amount: num(b.commissionAmount),
      probability: b.probability != null && !isNaN(Number(b.probability)) ? Math.max(0, Math.min(100, Number(b.probability))) : 20,
      expected_close: b.expectedClose || null,
      description: b.description ? String(b.description).slice(0, 8000) : null,
      owner_id: b.ownerId || access.userId,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('deals').insert(row).select('id, reference').single()
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'deal.created', targetType: 'deal', targetId: data.id, metadata: { title, reference: data.reference } })
    return NextResponse.json({ data })
  } catch (err) {
    logError('api.deals.post', err)
    return NextResponse.json({ error: 'Could not create the deal.' }, { status: 500 })
  }
}
