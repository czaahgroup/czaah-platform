import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const { id: threadId } = await params

  const { data: thread, error: threadError } = await access.supabase
    .from('mailbox_threads')
    .select('id, subject, external_address, mailbox_id, archived_at, starred_at, partner_mailboxes(address, display_name)')
    .eq('id', threadId)
    .single()

  if (threadError || !thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  if (!access.isSuperAdmin && thread.mailbox_id !== access.ownMailboxId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [{ data: messages, error: messagesError }, { data: threadLabels }] = await Promise.all([
    access.supabase
      .from('mailbox_messages')
      .select('id, direction, from_address, to_address, cc_addresses, subject, body_text, body_html, is_read, created_at, mailbox_attachments(id, filename, content_type, size)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true }),
    access.supabase
      .from('mailbox_thread_labels')
      .select('mailbox_labels(id, name, color)')
      .eq('thread_id', threadId),
  ])

  if (messagesError) return NextResponse.json({ error: messagesError.message }, { status: 500 })

  await access.supabase
    .from('mailbox_messages')
    .update({ is_read: true })
    .eq('thread_id', threadId)
    .eq('direction', 'inbound')
    .eq('is_read', false)

  const mailboxRel = Array.isArray(thread.partner_mailboxes) ? thread.partner_mailboxes[0] : thread.partner_mailboxes
  const labels = (threadLabels || [])
    .map((r) => (Array.isArray(r.mailbox_labels) ? r.mailbox_labels[0] : r.mailbox_labels))
    .filter(Boolean)

  return NextResponse.json({
    thread: {
      id: thread.id,
      subject: thread.subject,
      externalAddress: thread.external_address,
      mailboxAddress: mailboxRel?.address,
      mailboxDisplayName: mailboxRel?.display_name,
      archived: !!thread.archived_at,
      starred: !!thread.starred_at,
      labels,
    },
    messages,
  })
}

/**
 * Thread-level actions:
 *   archive | unarchive | delete | star | unstar | mark_read | mark_unread
 *   add_label | remove_label   (both take { labelId })
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const { id: threadId } = await params
  const { action, labelId } = await request.json()

  const { data: thread, error: threadError } = await access.supabase
    .from('mailbox_threads')
    .select('id, mailbox_id')
    .eq('id', threadId)
    .single()
  if (threadError || !thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  if (!access.isSuperAdmin && thread.mailbox_id !== access.ownMailboxId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = () => new Date().toISOString()

  if (action === 'mark_read' || action === 'mark_unread') {
    const { error } = await access.supabase
      .from('mailbox_messages')
      .update({ is_read: action === 'mark_read' })
      .eq('thread_id', threadId)
      .eq('direction', 'inbound')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'add_label' || action === 'remove_label') {
    if (!labelId) return NextResponse.json({ error: 'labelId is required' }, { status: 400 })
    const { data: label } = await access.supabase
      .from('mailbox_labels')
      .select('id')
      .eq('id', labelId)
      .eq('mailbox_id', thread.mailbox_id)
      .maybeSingle()
    if (!label) return NextResponse.json({ error: 'Label not found for this mailbox' }, { status: 404 })

    if (action === 'add_label') {
      const { error } = await access.supabase
        .from('mailbox_thread_labels')
        .upsert({ thread_id: threadId, label_id: labelId }, { onConflict: 'thread_id,label_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await access.supabase
        .from('mailbox_thread_labels')
        .delete()
        .eq('thread_id', threadId)
        .eq('label_id', labelId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  const patch: Record<string, string | null> = {}
  if (action === 'archive') patch.archived_at = now()
  else if (action === 'unarchive') patch.archived_at = null
  else if (action === 'delete') patch.deleted_at = now()
  else if (action === 'star') patch.starred_at = now()
  else if (action === 'unstar') patch.starred_at = null
  else return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const { error } = await access.supabase.from('mailbox_threads').update(patch).eq('id', threadId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
