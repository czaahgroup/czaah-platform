import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const KIND = ['property_sale', 'property_rental', 'investment', 'advisory', 'other']
const STAGE = ['lead', 'qualified', 'proposal', 'negotiation', 'due_diligence', 'agreement', 'closed_won', 'closed_lost']

async function loadScoped(access: any, id: string) {
  let q = access.supabase
    .from('deals')
    .select('*, company:crm_companies(id, name), property:property_listings(id, title, city, price, currency), investment:investment_opportunities(id, title, currency), owner:profiles!deals_owner_id_fkey(id, full_name)')
    .eq('id', id)
  q = scopeQuery(q, access)
  const { data } = await q.maybeSingle()
  return data
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    const deal = await loadScoped(access, id)
    if (!deal) return NextResponse.json({ error: 'Deal not found.' }, { status: 404 })

    const { data: parties } = await access.supabase
      .from('deal_parties')
      .select('id, role, note, created_at, contact:crm_contacts(id, name, email, type), company:crm_companies(id, name)')
      .eq('deal_id', id)
      .order('created_at', { ascending: true })

    return NextResponse.json({ data: { ...deal, parties: parties || [] } })
  } catch (err) {
    logError('api.deals.id.get', err)
    return NextResponse.json({ error: 'Could not load the deal.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    const before = await loadScoped(access, id)
    if (!before) return NextResponse.json({ error: 'Deal not found.' }, { status: 404 })

    const b = await request.json().catch(() => ({}))
    const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
    const patch: Record<string, unknown> = {}
    if (typeof b.title === 'string' && b.title.trim()) patch.title = b.title.trim().slice(0, 300)
    if (KIND.includes(b.kind)) patch.kind = b.kind
    if (STAGE.includes(b.stage)) patch.stage = b.stage
    if ('propertyId' in b) patch.property_id = b.propertyId || null
    if ('investmentId' in b) patch.investment_id = b.investmentId || null
    if ('companyId' in b) patch.company_id = b.companyId || null
    if ('country' in b) patch.country = b.country ? String(b.country).toUpperCase().slice(0, 2) : null
    if ('valueAmount' in b) patch.value_amount = num(b.valueAmount)
    if ('agreedAmount' in b) patch.agreed_amount = num(b.agreedAmount)
    if ('currency' in b) patch.currency = b.currency ? String(b.currency).toUpperCase().slice(0, 3) : null
    if ('commissionAmount' in b) patch.commission_amount = num(b.commissionAmount)
    if ('probability' in b && !isNaN(Number(b.probability))) patch.probability = Math.max(0, Math.min(100, Number(b.probability)))
    if ('expectedClose' in b) patch.expected_close = b.expectedClose || null
    if ('lostReason' in b) patch.lost_reason = b.lostReason ? String(b.lostReason).slice(0, 2000) : null
    if ('description' in b) patch.description = b.description ? String(b.description).slice(0, 8000) : null
    if ('ownerId' in b && access.scope === 'all') patch.owner_id = b.ownerId || null
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('deals').update(patch).eq('id', id)
    if (error) throw error

    if (patch.stage && patch.stage !== before.stage) {
      await logActivity({ actorId: access.userId, action: 'deal.stage_changed', targetType: 'deal', targetId: id, metadata: { from: before.stage, to: patch.stage } })
    } else {
      await logActivity({ actorId: access.userId, action: 'deal.updated', targetType: 'deal', targetId: id, metadata: { fields: Object.keys(patch) } })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.deals.id.patch', err)
    return NextResponse.json({ error: 'Could not update the deal.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.role !== 'super_admin') return NextResponse.json({ error: 'Only a super admin can delete a deal.' }, { status: 403 })
  try {
    const { id } = await params
    const { error } = await access.supabase.from('deals').delete().eq('id', id)
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'deal.deleted', targetType: 'deal', targetId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.deals.id.delete', err)
    return NextResponse.json({ error: 'Could not delete the deal.' }, { status: 500 })
  }
}
