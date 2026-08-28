import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'

export const runtime = 'edge'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const { id: threadId } = await params

  const { data: thread, error: threadError } = await access.supabase
    .from('mailbox_threads')
    .select('id, subject, external_address, mailbox_id, partner_mailboxes(address, display_name)')
    .eq('id', threadId)
    .single()

  if (threadError || !thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  if (!access.isSuperAdmin && thread.mailbox_id !== access.ownMailboxId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: messages, error: messagesError } = await access.supabase
    .from('mailbox_messages')
    .select('id, direction, from_address, to_address, subject, body_text, body_html, is_read, created_at, mailbox_attachments(id, filename, content_type, size)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (messagesError) return NextResponse.json({ error: messagesError.message }, { status: 500 })

  await access.supabase
    .from('mailbox_messages')
    .update({ is_read: true })
    .eq('thread_id', threadId)
    .eq('direction', 'inbound')
    .eq('is_read', false)

  const mailboxRel = Array.isArray(thread.partner_mailboxes) ? thread.partner_mailboxes[0] : thread.partner_mailboxes

  return NextResponse.json({
    thread: {
      id: thread.id,
      subject: thread.subject,
      externalAddress: thread.external_address,
      mailboxAddress: mailboxRel?.address,
      mailboxDisplayName: mailboxRel?.display_name,
    },
    messages,
  })
}
