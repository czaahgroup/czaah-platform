import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const TYPES = ['lead', 'prospect', 'client', 'partner', 'vendor', 'other']
const STAGES = ['new', 'engaged', 'qualified', 'active', 'dormant', 'lost']

async function loadScoped(access: Awaited<ReturnType<typeof requireCrmAccess>>, id: string) {
  if ('error' in access) return null
  let q = access.supabase
    .from('crm_contacts')
    .select('*, company:crm_companies(id, name, domain, stage), owner:profiles!crm_contacts_owner_id_fkey(id, full_name)')
    .eq('id', id)
  q = scopeQuery(q, access, ['owner_id', 'created_by', 'profile_id'])
  const { data } = await q.maybeSingle()
  return data
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    const contact = await loadScoped(access, id)
    if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })
    return NextResponse.json({ data: contact })
  } catch (err) {
    logError('api.crm.contacts.id.get', err)
    return NextResponse.json({ error: 'Could not load the contact.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params
    const existing = await loadScoped(access, id)
    if (!existing) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })

    const b = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}
    if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim()
    if ('phone' in b) patch.phone = b.phone ? String(b.phone).trim() : null
    if ('title' in b) patch.title = b.title ? String(b.title).trim() : null
    if ('notes' in b) patch.notes = b.notes ? String(b.notes).slice(0, 5000) : null
    if (TYPES.includes(b.type)) patch.type = b.type
    if (STAGES.includes(b.stage)) patch.stage = b.stage
    if ('companyId' in b) patch.company_id = b.companyId || null
    if ('ownerId' in b && access.scope === 'all') patch.owner_id = b.ownerId || null
    if (Array.isArray(b.tags)) patch.tags = b.tags.map(String).slice(0, 20)
    if ('email' in b) {
      const email = b.email ? String(b.email).trim().toLowerCase() : null
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return NextResponse.json({ error: 'That email address is not valid.' }, { status: 400 })
      }
      if (email && email !== existing.email) {
        const { data: dup } = await access.supabase.from('crm_contacts').select('id').eq('email', email).neq('id', id).maybeSingle()
        if (dup) return NextResponse.json({ error: 'Another contact already uses that email.' }, { status: 409 })
      }
      patch.email = email
    }

    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const { error } = await access.supabase.from('crm_contacts').update(patch).eq('id', id)
    if (error) throw error

    await logActivity({
      actorId: access.userId,
      action: 'contact.updated',
      targetType: 'contact',
      targetId: id,
      metadata: { fields: Object.keys(patch) },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.crm.contacts.id.patch', err)
    return NextResponse.json({ error: 'Could not update the contact.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.role !== 'super_admin') return NextResponse.json({ error: 'Only a super admin can delete a contact.' }, { status: 403 })
  try {
    const { id } = await params
    const { error } = await access.supabase.from('crm_contacts').delete().eq('id', id)
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'contact.deleted', targetType: 'contact', targetId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.crm.contacts.id.delete', err)
    return NextResponse.json({ error: 'Could not delete the contact.' }, { status: 500 })
  }
}
