import { NextRequest, NextResponse } from 'next/server'
import { requirePortalUser, PORTAL_SOURCES, PortalType } from '@/lib/portalAuth'
import { logError } from '@/lib/logError'

/** GET /api/portal/items — every resource shared with the caller, with a light summary */
export async function GET(request: NextRequest) {
  const access = await requirePortalUser(request)
  if ('error' in access) return access.error
  try {
    const { data: shares } = await access.supabase
      .from('portal_shares')
      .select('id, resource_type, resource_id, can_view_documents, title_override, created_at')
      .eq('profile_id', access.userId)
      .order('created_at', { ascending: false })

    const byType: Record<string, string[]> = {}
    for (const s of shares || []) (byType[s.resource_type] ||= []).push(s.resource_id)

    const summaries: Record<string, Record<string, any>> = {}
    await Promise.all(Object.entries(byType).map(async ([type, ids]) => {
      const src = PORTAL_SOURCES[type as PortalType]
      if (!src) return
      const { data } = await access.supabase.from(src.table).select(src.columns).in('id', ids)
      summaries[type] = {}
      for (const row of data || []) summaries[type][row.id] = row
    }))

    const items = (shares || []).map((s) => {
      const row = summaries[s.resource_type]?.[s.resource_id] || null
      const title = s.title_override || row?.title || row?.name || row?.reference || 'Shared item'
      return {
        shareId: s.id,
        type: s.resource_type,
        typeLabel: PORTAL_SOURCES[s.resource_type as PortalType]?.label || s.resource_type,
        id: s.resource_id,
        title,
        status: row?.stage || row?.status || null,
        reference: row?.reference || null,
        progressPct: row?.progress_pct ?? null,
        sharedAt: s.created_at,
      }
    }).filter((i) => summaries[i.type]?.[i.id]) // hide shares whose resource has since gone

    return NextResponse.json({ data: items })
  } catch (err) {
    logError('api.portal.items.get', err)
    return NextResponse.json({ error: 'Could not load your portfolio.' }, { status: 500 })
  }
}
