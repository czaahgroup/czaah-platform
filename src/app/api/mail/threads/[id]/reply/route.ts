import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'
import { resend } from '@/lib/resend/client'

export const runtime = 'edge'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const { id: threadId } = await params

  const { body } = await request.json()
  if (!body || !String(body).trim()) {
    return NextResponse.json({ error: 'Message body is required.' }, { status: 400 })
  }

  const { data: thread, error: threadError } = await access.supabase
    .from('mailbox_threads')
    .select('id, subject, external_address, mailbox_id, partner_mailboxes(address, display_name)')
    .eq('id', threadId)
    .single()

  if (threadError || !thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  if (!access.isSuperAdmin && thread.mailbox_id !== access.ownMailboxId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const mailboxRel = Array.isArray(thread.partner_mailboxes) ? thread.partner_mailboxes[0] : thread.partner_mailboxes
  if (!mailboxRel) return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 })

  const { data: lastInbound } = await access.supabase
    .from('mailbox_messages')
    .select('message_id_header')
    .eq('thread_id', threadId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const fromAddress = `${mailboxRel.display_name || mailboxRel.address} <${mailboxRel.address}>`
  const subject = thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`

  const headers: Record<string, string> = {}
  if (lastInbound?.message_id_header) {
    headers['In-Reply-To'] = lastInbound.message_id_header
    headers['References'] = lastInbound.message_id_header
  }

  const { data: sent, error: sendError } = await resend.emails.send({
    from: fromAddress,
    to: thread.external_address,
    subject,
    text: String(body),
    headers,
  })

  if (sendError) {
    return NextResponse.json({ error: sendError.message || 'Failed to send email.' }, { status: 502 })
  }

  const { data: inserted, error: insertError } = await access.supabase
    .from('mailbox_messages')
    .insert({
      thread_id: threadId,
      mailbox_id: thread.mailbox_id,
      direction: 'outbound',
      from_address: mailboxRel.address,
      to_address: thread.external_address,
      subject,
      body_text: String(body),
      message_id_header: sent?.id ? `<${sent.id}@resend.dev>` : null,
      is_read: true,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  await access.supabase.from('mailbox_threads').update({ last_message_at: new Date().toISOString() }).eq('id', threadId)

  return NextResponse.json({ success: true, data: inserted })
}
