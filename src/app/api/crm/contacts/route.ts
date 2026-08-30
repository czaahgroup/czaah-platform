import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const TYPES = ['lead', 'prospect', 'client', 'partner', 'vendor', 'other']
const STAGES = ['new', 'engaged', 'qualified', 'active', 'dormant', 'lost']
const PAGE = 50

/** GET /api/crm/contacts — filtered, paginated list. */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error

  try {
    const p = request.nextUrl.searchParams
    const type = p.get('type')
    const stage = p.get('stage')
    const companyId = p.get('companyId')
    const ownerId = p.get('ownerId')
    const q = p.get('q')?.trim()
    const page = Math.max(0, parseInt(p.get('page') || '0', 10))

    let query = access.supabase
      .from('crm_contacts')
      .select('id, name, email, phone, title, type, stage, tags, last_activity_at, created_at, company:crm_companies(id, name)', { count: 'exact' })
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    query = scopeQuery(query, access, ['owner_id', 'created_by', 'profile_id'])
    if (type && TYPES.includes(type)) query = query.eq('type', type)
    if (stage && STAGES.includes(stage)) query = query.eq('stage', stage)
    if (companyId) query = query.eq('company_id', companyId)
    if (ownerId) query = query.eq('owner_id', ownerId)
    if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      data: data || [],
      page,
      pageSize: PAGE,
      total: count ?? 0,
      hasMore: (count ?? 0) > (page + 1) * PAGE,
    })
  } catch (err) {
    logError('api.crm.contacts.get', err)
    return NextResponse.json({ error: 'Could not load contacts.' }, { status: 500 })
  }
}

/** POST /api/crm/contacts — create. */
export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error

  try {
    const b = await request.json().catch(() => ({}))
    const name = String(b.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

    const email = b.email ? String(b.email).trim().toLowerCase() : null
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'That email address is not valid.' }, { status: 400 })
    }
    if (email) {
      const { data: dup } = await access.supabase.from('crm_contacts').select('id').eq('email', email).maybeSingle()
      if (dup) return NextResponse.json({ error: 'A contact with that email already exists.', existingId: dup.id }, { status: 409 })
    }

    const row = {
      name,
      email,
      phone: b.phone ? String(b.phone).trim() : null,
      title: b.title ? String(b.title).trim() : null,
      type: TYPES.includes(b.type) ? b.type : 'lead',
      stage: STAGES.includes(b.stage) ? b.stage : 'new',
      source: b.source ? String(b.source).slice(0, 40) : 'manual',
      company_id: b.companyId || null,
      owner_id: b.ownerId || access.userId,
      tags: Array.isArray(b.tags) ? b.tags.map(String).slice(0, 20) : [],
      notes: b.notes ? String(b.notes).slice(0, 5000) : null,
      created_by: access.userId,
    }

    const { data, error } = await access.supabase.from('crm_contacts').insert(row).select('id').single()
    if (error) throw error

    await logActivity({
      actorId: access.userId,
      action: 'contact.created',
      targetType: 'contact',
      targetId: data.id,
      metadata: { name, type: row.type },
    })

    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.crm.contacts.post', err)
    return NextResponse.json({ error: 'Could not create the contact.' }, { status: 500 })
  }
}
