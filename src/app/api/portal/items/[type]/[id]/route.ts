import { NextRequest, NextResponse } from 'next/server'
import { requirePortalUser, PORTAL_SOURCES, PORTAL_TYPES, PortalType } from '@/lib/portalAuth'
import { logError } from '@/lib/logError'

/**
 * GET /api/portal/items/[type]/[id] — one shared resource, sanitised for
 * the client: the summary, its progress checklist, and (if the share
 * allows) its documents. Nothing internal — no owner, no financial
 * internals beyond what is on the summary column list.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const access = await requirePortalUser(request)
  if ('error' in access) return access.error
  try {
    const { type, id } = await params
    if (!PORTAL_TYPES.includes(type as PortalType)) return NextResponse.json({ error: 'Unknown item type.' }, { status: 400 })

    const { data: share } = await access.supabase
      .from('portal_shares')
      .select('id, can_view_documents')
      .eq('profile_id', access.userId)
      .eq('resource_type', type)
      .eq('resource_id', id)
      .maybeSingle()
    if (!share) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

    const src = PORTAL_SOURCES[type as PortalType]
    const { data: resource } = await access.supabase.from(src.table).select(src.columns).eq('id', id).maybeSingle()
    if (!resource) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

    let steps: any[] = []
    if (type === 'construction_project') {
      const { data } = await access.supabase.from('construction_milestones')
        .select('name, status, target_date, done_date').eq('project_id', id).order('sort_order', { ascending: true })
      steps = data || []
    } else if (type === 'commodity_trade') {
      const { data } = await access.supabase.from('trade_steps')
        .select('name, status, due_date, done_date').eq('trade_id', id).order('sort_order', { ascending: true })
      steps = data || []
    }

    let updates: any[] = []
    if (type === 'construction_project') {
      const { data } = await access.supabase.from('construction_updates')
        .select('report_date, progress_pct, headline, body').eq('project_id', id).order('report_date', { ascending: false }).limit(20)
      updates = data || []
    }

    let documents: any[] = []
    if (share.can_view_documents) {
      const { data: docs } = await access.supabase
        .from('crm_documents')
        .select('id, filename, content_type, size_bytes, storage_path, created_at')
        .eq('related_type', type)
        .eq('related_id', id)
        .order('created_at', { ascending: false })
      documents = await Promise.all((docs || []).map(async (d) => {
        const { data: signed } = await access.supabase.storage.from('crm-documents').createSignedUrl(d.storage_path, 300)
        return { id: d.id, filename: d.filename, sizeBytes: d.size_bytes, createdAt: d.created_at, url: signed?.signedUrl || null }
      }))
    }

    return NextResponse.json({
      data: { type, typeLabel: src.label, resource, steps, updates, documents, canViewDocuments: share.can_view_documents },
    })
  } catch (err) {
    logError('api.portal.item.get', err)
    return NextResponse.json({ error: 'Could not load this item.' }, { status: 500 })
  }
}
