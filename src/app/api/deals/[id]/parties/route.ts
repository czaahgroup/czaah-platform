import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const ROLES = ['buyer', 'seller', 'investor', 'landlord', 'tenant', 'agent', 'advisor', 'lender', 'other']

async function dealVisible(access: any, id: string) {
  let q = access.supabase.from('deals').select('id').eq('id', id)
  q = scopeQuery(q, access)
  const { data } = await q.maybeSingle()
  return !!data
}

/** POST /api/deals/[id]/parties  — attach a CRM contact or company to the deal */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await dealVisible(access, id))) return NextResponse.json({ error: 'Deal not found.' }, { status: 404 })

    const b = await request.json().catch(() => ({}))
    if (!b.contactId && !b.companyId) return NextResponse.json({ error: 'A contact or company is required.' }, { status: 400 })
    const role = ROLES.includes(b.role) ? b.role : 'other'

    const row = {
      deal_id: id,
      contact_id: b.contactId || null,
      company_id: b.companyId || null,
      role,
      note: b.note ? String(b.note).slice(0, 1000) : null,
      created_by: access.userId,
    }
    const { data, error } = await access.supabase.from('deal_parties').insert(row).select('id').single()
    if (error) {
      if ((error as any).code === '23505') return NextResponse.json({ error: 'That party is already on the deal in this role.' }, { status: 409 })
      throw error
    }
    await logActivity({ actorId: access.userId, action: 'deal.party_added', targetType: 'deal', targetId: id, metadata: { role, contactId: b.contactId, companyId: b.companyId } })
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.deals.parties.post', err)
    return NextResponse.json({ error: 'Could not add the party.' }, { status: 500 })
  }
}

/** DELETE /api/deals/[id]/parties?partyId=<uuid> */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await dealVisible(access, id))) return NextResponse.json({ error: 'Deal not found.' }, { status: 404 })
    const partyId = request.nextUrl.searchParams.get('partyId')
    if (!partyId) return NextResponse.json({ error: 'partyId is required.' }, { status: 400 })
    const { error } = await access.supabase.from('deal_parties').delete().eq('id', partyId).eq('deal_id', id)
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'deal.party_removed', targetType: 'deal', targetId: id, metadata: { partyId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.deals.parties.delete', err)
    return NextResponse.json({ error: 'Could not remove the party.' }, { status: 500 })
  }
}
