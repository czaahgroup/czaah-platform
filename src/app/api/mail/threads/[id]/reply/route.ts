import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'
import { resend } from '@/lib/resend/client'
import { htmlToText, appendSignature } from '@/lib/mailFormat'
import { parseAttachmentRefs, resendAttachmentsFromRefs, persistOutboundAttachments } from '@/lib/mailAttachments'


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseAddressList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim().toLowerCase()).filter((v) => EMAIL_RE.test(v))
  return String(value || '')
    .split(/[,;\s]+/)
    .map((v) => v.trim().toLowerCase())
    .filter((v) => EMAIL_RE.test(v))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const { id: threadId } = await params

  const { body, bodyHtml, cc, replyAll, attachments: rawAttachments } = await request.json()

  const { data: thread, error: threadError } = await access.supabase
    .from('mailbox_threads')
    .select('id, subject, external_address, mailbox_id, partner_mailboxes(address, display_name, signature_html)')
    .eq('id', threadId)
    .single()

  if (threadError || !thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  if (!access.isSuperAdmin && thread.mailbox_id !== access.ownMailboxId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsedAtt = parseAttachmentRefs(rawAttachments, thread.mailbox_id)
  if (!parsedAtt.ok) return NextResponse.json({ error: parsedAtt.error }, { status: 400 })

  const mailboxRel = Array.isArray(thread.partner_mailboxes) ? thread.partner_mailboxes[0] : thread.partner_mailboxes
  if (!mailboxRel) return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 })

  const html = appendSignature(bodyHtml ? String(bodyHtml) : null, mailboxRel.signature_html)
  const text = html ? htmlToText(html) : String(body || '')
  if (!text.trim() && !html) {
    return NextResponse.json({ error: 'Message body is required.' }, { status: 400 })
  }

  const { data: lastInbound } = await access.supabase
    .from('mailbox_messages')
    .select('message_id_header, cc_addresses')
    .eq('thread_id', threadId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ownAddress = mailboxRel.address.toLowerCase()
  const ccSet = new Set<string>(parseAddressList(cc))
  if (replyAll) {
    for (const addr of parseAddressList(lastInbound?.cc_addresses)) ccSet.add(addr)
  }
  ccSet.delete(ownAddress)
  ccSet.delete(thread.external_address.toLowerCase())
  const ccList = [...ccSet]

  const fromAddress = `${mailboxRel.display_name || mailboxRel.address} <${mailboxRel.address}>`
  const subject = thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`

  const headers: Record<string, string> = {}
  if (lastInbound?.message_id_header) {
    headers['In-Reply-To'] = lastInbound.message_id_header
    headers['References'] = lastInbound.message_id_header
  }

  const sendPayload: Record<string, unknown> = {
    from: fromAddress,
    to: thread.external_address,
    subject,
    text: text || undefined,
    html: html || undefined,
    headers,
  }
  if (ccList.length) sendPayload.cc = ccList
  if (parsedAtt.refs.length) sendPayload.attachments = await resendAttachmentsFromRefs(access.supabase, parsedAtt.refs)

  const { data: sent, error: sendError } = await resend.emails.send(sendPayload as never)

  if (sendError) {
    console.error('[mail reply] resend send failed', JSON.stringify(sendError), 'attachments:', parsedAtt.refs.map((a) => `${a.filename} ${a.size}b`))
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
      cc_addresses: ccList.length ? ccList : null,
      subject,
      body_text: text || null,
      body_html: html || null,
      message_id_header: sent?.id ? `<${sent.id}@resend.dev>` : null,
      is_read: true,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  if (parsedAtt.refs.length && inserted?.id) {
    await persistOutboundAttachments(access.supabase, thread.mailbox_id, inserted.id, parsedAtt.refs)
  }

  await access.supabase.from('mailbox_threads').update({ last_message_at: new Date().toISOString() }).eq('id', threadId)

  // Re-read so the response carries any attachments just persisted.
  const { data: full } = await access.supabase
    .from('mailbox_messages')
    .select('id, direction, from_address, to_address, cc_addresses, subject, body_text, body_html, is_read, created_at, mailbox_attachments(id, filename, content_type, size)')
    .eq('id', inserted.id)
    .single()

  return NextResponse.json({ success: true, data: full || inserted })
}
