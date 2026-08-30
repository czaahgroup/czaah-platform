import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, safeTerm } from '@/lib/crmAuth'
import { PORTAL_TYPES, PORTAL_SOURCES, PortalType } from '@/lib/portalAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

/**
 * Admin management of client-portal grants.
 *
 * GET  ?resource=<type>&id=<uuid>  — shares on one resource
 * GET  ?q=<term>                   — search grantable resources + members (for the picker)
 * POST { profileId, resourceType, resourceId, canViewDocuments }
 * DELETE ?shareId=<uuid>
 */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.scope !== 'all') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const p = request.nextUrl.searchParams
    const resource = p.get('resource')
    const id = p.get('id')
    const q = safeTerm(p.get('q'))

    if (resource && id) {
      const { data } = await access.supabase
        .from('portal_shares')
        .select('id, can_view_documents, created_at, profile:profiles!portal_shares_profile_id_fkey(id, full_name, email)')
        .eq('resource_type', resource).eq('resource_id', id)
        .order('created_at', { ascending: false })
      return NextResponse.json({ data: data || [] })
    }

    // picker mode
    const like = q ? `%${q}%` : '%'
    const [members, deals, projects, trades] = await Promise.all([
      access.supabase.from('profiles').select('id, full_name, email').in('role', ['member', 'partner', 'investment_partner', 'real_estate_partner']).ilike('full_name', like).limit(20),
      access.supabase.from('deals').select('id, reference, title').ilike('title', like).limit(15),
      access.supabase.from('construction_projects').select('id, reference, name').ilike('name', like).limit(15),
      access.supabase.from('commodity_trades').select('id, reference, title').ilike('title', like).limit(15),
    ])
    return NextResponse.json({
      members: members.data || [],
      resources: [
        ...(deals.data || []).map((r) => ({ type: 'deal', id: r.id, label: `${r.reference} · ${r.title}` })),
        ...(projects.data || []).map((r) => ({ type: 'construction_project', id: r.id, label: `${r.reference} · ${r.name}` })),
        ...(trades.data || []).map((r) => ({ type: 'commodity_trade', id: r.id, label: `${r.reference} · ${r.title}` })),
      ],
    })
  } catch (err) {
    logError('api.admin.portal-shares.get', err)
    return NextResponse.json({ error: 'Could not load portal shares.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.scope !== 'all') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const b = await request.json().catch(() => ({}))
    if (!b.profileId || !PORTAL_TYPES.includes(b.resourceType) || !b.resourceId) {
      return NextResponse.json({ error: 'profileId, resourceType and resourceId are required.' }, { status: 400 })
    }
    const src = PORTAL_SOURCES[b.resourceType as PortalType]
    const { data: exists } = await access.supabase.from(src.table).select('id').eq('id', b.resourceId).maybeSingle()
    if (!exists) return NextResponse.json({ error: 'That resource does not exist.' }, { status: 404 })

    const row = {
      profile_id: b.profileId,
      resource_type: b.resourceType,
      resource_id: b.resourceId,
      can_view_documents: b.canViewDocuments !== false,
      title_override: b.titleOverride ? String(b.titleOverride).slice(0, 200) : null,
      shared_by: access.userId,
    }
    const { data, error } = await access.supabase.from('portal_shares').insert(row).select('id').single()
    if (error) {
      if ((error as any).code === '23505') return NextResponse.json({ error: 'Already shared with that client.' }, { status: 409 })
      throw error
    }
    await logActivity({ actorId: access.userId, action: 'portal.shared', targetType: b.resourceType, targetId: b.resourceId, metadata: { profileId: b.profileId } })
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.admin.portal-shares.post', err)
    return NextResponse.json({ error: 'Could not create the share.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.scope !== 'all') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const shareId = request.nextUrl.searchParams.get('shareId')
    if (!shareId) return NextResponse.json({ error: 'shareId is required.' }, { status: 400 })
    const { data: sh } = await access.supabase.from('portal_shares').select('resource_type, resource_id, profile_id').eq('id', shareId).maybeSingle()
    const { error } = await access.supabase.from('portal_shares').delete().eq('id', shareId)
    if (error) throw error
    if (sh) await logActivity({ actorId: access.userId, action: 'portal.unshared', targetType: sh.resource_type, targetId: sh.resource_id, metadata: { profileId: sh.profile_id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.portal-shares.delete', err)
    return NextResponse.json({ error: 'Could not remove the share.' }, { status: 500 })
  }
}
