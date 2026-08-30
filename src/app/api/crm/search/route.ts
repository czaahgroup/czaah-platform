import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery, safeTerm } from '@/lib/crmAuth'
import { logError } from '@/lib/logError'

/**
 * GET /api/crm/search?q=<term>
 * Cross-entity: contacts, companies, enquiries, opportunities. Typed results,
 * scoped to the caller. Capped per type.
 */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const q = safeTerm(request.nextUrl.searchParams.get('q'))
    if (q.length < 2) return NextResponse.json({ data: [] })
    const like = `%${q}%`
    const sb = access.supabase

    let contactsQ = sb.from('crm_contacts')
      .select('id, name, email, type, company:crm_companies(name)')
      .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(6)
    contactsQ = scopeQuery(contactsQ, access, ['owner_id', 'created_by', 'profile_id'])

    let companiesQ = sb.from('crm_companies')
      .select('id, name, domain, stage')
      .or(`name.ilike.${like},domain.ilike.${like}`)
      .limit(6)
    companiesQ = scopeQuery(companiesQ, access)

    const enquiriesQ = access.scope === 'all'
      ? sb.from('enquiries').select('id, reference_number, product_name, status').or(`reference_number.ilike.${like},product_name.ilike.${like},description.ilike.${like}`).limit(6)
      : Promise.resolve({ data: [] })

    const oppsQ = access.scope === 'all'
      ? sb.from('partner_opportunities').select('id, reference_number, title, status').or(`reference_number.ilike.${like},title.ilike.${like}`).limit(6)
      : Promise.resolve({ data: [] })

    const [contacts, companies, enquiries, opps] = await Promise.all([contactsQ, companiesQ, enquiriesQ, oppsQ])

    const results = [
      ...(contacts.data || []).map((c: any) => ({ kind: 'contact', id: c.id, label: c.name, sub: c.email || c.company?.name || c.type, href: `/admin/crm/contacts/${c.id}` })),
      ...(companies.data || []).map((c: any) => ({ kind: 'company', id: c.id, label: c.name, sub: c.domain || c.stage, href: `/admin/crm/companies/${c.id}` })),
      ...(enquiries.data || []).map((e: any) => ({ kind: 'enquiry', id: e.id, label: e.reference_number, sub: `${e.product_name || 'Enquiry'} · ${e.status}`, href: `/admin/enquiries/${e.id}` })),
      ...(opps.data || []).map((o: any) => ({ kind: 'opportunity', id: o.id, label: o.title || o.reference_number, sub: `${o.reference_number} · ${o.status}`, href: `/admin/partner-opportunities` })),
    ]

    return NextResponse.json({ data: results })
  } catch (err) {
    logError('api.crm.search.get', err)
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
  }
}
