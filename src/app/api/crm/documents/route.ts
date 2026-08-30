import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const OBJECTS = ['contact', 'company', 'enquiry', 'partner_opportunity', 'investment_opportunity', 'mail_thread', 'deal']
const BUCKET = 'crm-documents'
const BLOCKED = /\.(exe|bat|cmd|com|scr|pif|msi|dll|vbs|js|jar|ps1|sh|apk|dmg)$/i

/** GET /api/crm/documents?type=contact&id=<uuid> — list with download URLs. */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const type = request.nextUrl.searchParams.get('type')
    const id = request.nextUrl.searchParams.get('id')
    if (!type || !OBJECTS.includes(type) || !id) {
      return NextResponse.json({ error: 'type and id are required.' }, { status: 400 })
    }
    const { data, error } = await access.supabase
      .from('crm_documents')
      .select('id, filename, content_type, size_bytes, label, storage_path, created_at, uploader:profiles!crm_documents_uploaded_by_fkey(full_name)')
      .eq('related_type', type)
      .eq('related_id', id)
      .order('created_at', { ascending: false })
    if (error) throw error

    const withUrls = await Promise.all((data || []).map(async (d) => {
      const { data: signed } = await access.supabase.storage.from(BUCKET).createSignedUrl(d.storage_path, 300)
      return {
        id: d.id, filename: d.filename, contentType: d.content_type, sizeBytes: d.size_bytes,
        label: d.label, createdAt: d.created_at, uploadedBy: d.uploader?.full_name || null,
        url: signed?.signedUrl || null,
      }
    }))
    return NextResponse.json({ data: withUrls })
  } catch (err) {
    logError('api.crm.documents.get', err)
    return NextResponse.json({ error: 'Could not load documents.' }, { status: 500 })
  }
}

/** POST /api/crm/documents  { action:'upload-url', filename, type, id }  -> signed PUT URL
 *  POST /api/crm/documents  { type, id, path, filename, contentType, sizeBytes, label } -> record */
export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    if (!b.type || !OBJECTS.includes(b.type) || !b.id) {
      return NextResponse.json({ error: 'type and id are required.' }, { status: 400 })
    }

    if (b.action === 'upload-url') {
      const name = String(b.filename || '').trim()
      if (!name) return NextResponse.json({ error: 'filename required.' }, { status: 400 })
      if (BLOCKED.test(name)) return NextResponse.json({ error: 'Executables and scripts are not allowed.' }, { status: 400 })
      const safe = name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180)
      const path = `${b.type}/${b.id}/${crypto.randomUUID()}/${safe}`
      const { data, error } = await access.supabase.storage.from(BUCKET).createSignedUploadUrl(path)
      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Could not create upload URL. Is the crm-documents bucket set up?' }, { status: 500 })
      }
      return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl, filename: safe })
    }

    // record metadata
    if (!b.path || !b.filename) return NextResponse.json({ error: 'path and filename are required.' }, { status: 400 })
    const { data, error } = await access.supabase
      .from('crm_documents')
      .insert({
        related_type: b.type,
        related_id: b.id,
        filename: String(b.filename).slice(0, 200),
        content_type: b.contentType ? String(b.contentType).slice(0, 120) : null,
        size_bytes: typeof b.sizeBytes === 'number' ? Math.round(b.sizeBytes) : null,
        storage_path: String(b.path),
        label: b.label ? String(b.label).slice(0, 200) : null,
        uploaded_by: access.userId,
      })
      .select('id')
      .single()
    if (error) throw error

    await logActivity({
      actorId: access.userId, action: 'document.uploaded',
      targetType: b.type, targetId: b.id, metadata: { documentId: data.id, filename: b.filename },
    })
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.crm.documents.post', err)
    return NextResponse.json({ error: 'Could not save the document.' }, { status: 500 })
  }
}

/** DELETE /api/crm/documents?docId=<uuid> */
export async function DELETE(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const docId = request.nextUrl.searchParams.get('docId')
    if (!docId) return NextResponse.json({ error: 'docId is required.' }, { status: 400 })
    const { data: doc } = await access.supabase.from('crm_documents').select('storage_path, uploaded_by, related_type, related_id').eq('id', docId).maybeSingle()
    if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    if (doc.uploaded_by !== access.userId && access.role !== 'super_admin') {
      return NextResponse.json({ error: 'You can only delete your own uploads.' }, { status: 403 })
    }
    await access.supabase.storage.from(BUCKET).remove([doc.storage_path])
    const { error } = await access.supabase.from('crm_documents').delete().eq('id', docId)
    if (error) throw error
    await logActivity({ actorId: access.userId, action: 'document.deleted', targetType: doc.related_type, targetId: doc.related_id, metadata: { documentId: docId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.crm.documents.delete', err)
    return NextResponse.json({ error: 'Could not delete the document.' }, { status: 500 })
  }
}
