import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const STAGES = ['new', 'engaged', 'qualified', 'active', 'dormant', 'lost']

async function loadScoped(access: Awaited<ReturnType<typeof requireCrmAccess>>, id: string) {
  if ('error' in access) return null
  let q = access.supabase
    .from('crm_companies')
    .select('*, sector:sectors(id, name), owner:profiles!crm_companies_owner_id_fkey(id, full_name), contacts:crm_contacts(id, name, email, type, stage)')
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
    const company = await loadScoped(access, id)
    if (!company) return NextResponse.json({ error: 'Company not found.' }, { status: 404 })
    return NextResponse.json({ data: company })
  } catch (err) {
    logError('api.crm.companies.id.get', err)
    return NextResponse.json({ error: 'Could not load the company.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    if (!(await loadScoped(access, id))) return NextResponse.json({ error: 'Company not found.' }, { status: 404 })
    const b = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}
    if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim()
    if ('domain' in b) patch.domain = b.domain ? String(b.domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null
    if ('website' in b) patch.website = b.website ? String(b.website).trim() : null
    if ('country' in b) patch.country = b.country ? String(b.country).trim() : null
    if ('companySize' in b) patch.company_size = b.companySize ? String(b.companySize).slice(0, 20) : null
    if ('description' in b) patch.description = b.description ? String(b.description).slice(0, 5000) : null
    if (STAGES.includes(b.stage)) patch.stage = b.stage
    if ('sectorId' in b) patch.sector_id = b.sectorId || null
    if ('ownerId' in b && access.scope === 'all') patch.owner_id = b.ownerId || null
    if (['company', 'investor', 'partner_firm', 'government', 'fund', 'counterparty', 'other'].includes(b.orgType)) patch.org_type = b.orgType
    if ('registrationNumber' in b) patch.registration_number = b.registrationNumber ? String(b.registrationNumber).slice(0, 100) : null
    if ('regulator' in b) patch.regulator = b.regulator ? String(b.regulator).slice(0, 200) : null
    if ('jurisdiction' in b) patch.jurisdiction = b.jurisdiction ? String(b.jurisdiction).toUpperCase().slice(0, 2) : null
    if (['none', 'pending', 'cleared', 'flagged'].includes(b.kycStatus)) patch.kyc_status = b.kycStatus
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('crm_companies').update(patch).eq('id', id)
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'company.updated', targetType: 'company', targetId: id, metadata: { fields: Object.keys(patch) } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.crm.companies.id.patch', err)
    return NextResponse.json({ error: 'Could not update the company.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.role !== 'super_admin') return NextResponse.json({ error: 'Only a super admin can delete a company.' }, { status: 403 })
  try {
    const { id } = await params
    // detach contacts rather than cascade-deleting them
    await access.supabase.from('crm_contacts').update({ company_id: null }).eq('company_id', id)
    const { error } = await access.supabase.from('crm_companies').delete().eq('id', id)
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'company.deleted', targetType: 'company', targetId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.crm.companies.id.delete', err)
    return NextResponse.json({ error: 'Could not delete the company.' }, { status: 500 })
  }
}
