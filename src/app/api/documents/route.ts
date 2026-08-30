import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, safeTerm } from '@/lib/crmAuth'
import { logError } from '@/lib/logError'

/**
 * GET /api/documents — unified document library (P3-0).
 *
 * Surfaces the CRM document store plus shared documents in one list. As
 * Phase-3 modules are built they write to crm_documents, so this view grows
 * with the platform without per-module plumbing.
 *
 * ?q= filename search  ?type=<crm_object>  ?page=
 */
const PAGE = 50

export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const p = request.nextUrl.searchParams
    const q = safeTerm(p.get('q'))
    const type = p.get('type')
    const page = Math.max(0, parseInt(p.get('page') || '0', 10))

    let cq = access.supabase
      .from('crm_documents')
      .select('id, filename, content_type, size_bytes, label, storage_path, related_type, related_id, created_at, uploader:profiles!crm_documents_uploaded_by_fkey(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (q) cq = cq.ilike('filename', `%${q}%`)
    if (type) cq = cq.eq('related_type', type)

    const { data, error, count } = await cq
    if (error) throw error

    const items = await Promise.all((data || []).map(async (d) => {
      const { data: signed } = await access.supabase.storage.from('crm-documents').createSignedUrl(d.storage_path, 300)
      return {
        id: d.id,
        source: 'crm',
        filename: d.filename,
        label: d.label,
        contentType: d.content_type,
        sizeBytes: d.size_bytes,
        relatedType: d.related_type,
        relatedId: d.related_id,
        relatedHref: hrefFor(d.related_type, d.related_id),
        uploadedBy: d.uploader?.full_name || null,
        createdAt: d.created_at,
        url: signed?.signedUrl || null,
      }
    }))

    return NextResponse.json({
      data: items, page, pageSize: PAGE, total: count ?? 0,
      hasMore: (count ?? 0) > (page + 1) * PAGE,
    })
  } catch (err) {
    logError('api.documents.get', err)
    return NextResponse.json({ error: 'Could not load documents.' }, { status: 500 })
  }
}

function hrefFor(type: string, id: string): string | null {
  switch (type) {
    case 'contact': return `/admin/crm/contacts/${id}`
    case 'company': return `/admin/crm/companies/${id}`
    case 'enquiry': return `/admin/enquiries/${id}`
    case 'deal': return `/admin/crm/deals/${id}`
    case 'construction_project': return `/admin/construction/projects/${id}`
    default: return null
  }
}
