import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

const OBJECTS = ['contact', 'company', 'enquiry', 'partner_opportunity', 'investment_opportunity', 'mail_thread', 'deal', 'construction_project', 'commodity_trade']

/** GET /api/crm/notes?type=contact&id=<uuid> */
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
      .from('crm_notes')
      .select('id, body, pinned, created_at, updated_at, author:profiles!crm_notes_author_id_fkey(id, full_name)')
      .eq('related_type', type)
      .eq('related_id', id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err) {
    logError('api.crm.notes.get', err)
    return NextResponse.json({ error: 'Could not load notes.' }, { status: 500 })
  }
}

/** POST /api/crm/notes  { type, id, body, pinned? } */
export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const body = String(b.body || '').trim()
    if (!b.type || !OBJECTS.includes(b.type) || !b.id) {
      return NextResponse.json({ error: 'type and id are required.' }, { status: 400 })
    }
    if (!body) return NextResponse.json({ error: 'The note is empty.' }, { status: 400 })

    const { data, error } = await access.supabase
      .from('crm_notes')
      .insert({
        body: body.slice(0, 20000),
        author_id: access.userId,
        related_type: b.type,
        related_id: b.id,
        pinned: !!b.pinned,
      })
      .select('id')
      .single()
    if (error) throw error

    await logActivity({
      actorId: access.userId,
      action: 'note.added',
      targetType: b.type,
      targetId: b.id,
      metadata: { noteId: data.id, preview: body.slice(0, 120) },
    })
    return NextResponse.json({ data: { id: data.id } })
  } catch (err) {
    logError('api.crm.notes.post', err)
    return NextResponse.json({ error: 'Could not save the note.' }, { status: 500 })
  }
}

/** DELETE /api/crm/notes?noteId=<uuid> — author or super_admin */
export async function DELETE(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const noteId = request.nextUrl.searchParams.get('noteId')
    if (!noteId) return NextResponse.json({ error: 'noteId is required.' }, { status: 400 })
    const { data: note } = await access.supabase.from('crm_notes').select('author_id, related_type, related_id').eq('id', noteId).maybeSingle()
    if (!note) return NextResponse.json({ error: 'Note not found.' }, { status: 404 })
    if (note.author_id !== access.userId && access.role !== 'super_admin') {
      return NextResponse.json({ error: 'You can only delete your own notes.' }, { status: 403 })
    }
    const { error } = await access.supabase.from('crm_notes').delete().eq('id', noteId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.crm.notes.delete', err)
    return NextResponse.json({ error: 'Could not delete the note.' }, { status: 500 })
  }
}
