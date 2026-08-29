import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess, resolveMailboxId } from '@/lib/mailAuth'
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

export async function GET(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const params = request.nextUrl.searchParams
  const resolved = resolveMailboxId(access, params.get('mailboxId'))
  if ('error' in resolved) return resolved.error
  const { mailboxId } = resolved

  const filter = params.get('filter') || 'inbox' // inbox | archived | starred | all
  const labelId = params.get('labelId')
  const rawQuery = (params.get('q') || '').trim()
  const query = rawQuery.replace(/[,()%_*\\]/g, ' ').trim()

  let threadQuery = access.supabase
    .from('mailbox_threads')
    .select('id, subject, external_address, last_message_at, archived_at, deleted_at, starred_at')
    .eq('mailbox_id', mailboxId)
    .is('deleted_at', null)
    .order('last_message_at', { ascending: false })

  if (filter === 'inbox') threadQuery = threadQuery.is('archived_at', null)
  else if (filter === 'archived') threadQuery = threadQuery.not('archived_at', 'is', null)
  else if (filter === 'starred') threadQuery = threadQuery.not('starred_at', 'is', null)

  if (labelId) {
    const { data: tagged } = await access.supabase
      .from('mailbox_thread_labels')
      .select('thread_id')
      .eq('label_id', labelId)
    const ids = (tagged || []).map((r) => r.thread_id)
    threadQuery = threadQuery.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  }

  if (query) {
    const { data: bodyMatches } = await access.supabase
      .from('mailbox_messages')
      .select('thread_id')
      .eq('mailbox_id', mailboxId)
      .ilike('body_text', `%${query}%`)
    const ids = [...new Set((bodyMatches || []).map((m) => m.thread_id))]
    const orParts = [`subject.ilike.%${query}%`, `external_address.ilike.%${query}%`]
    if (ids.length) orParts.push(`id.in.(${ids.join(',')})`)
    threadQuery = threadQuery.or(orParts.join(','))
  }

  const { data: threads, error } = await threadQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!threads?.length) return NextResponse.json({ data: [] })

  const threadIds = threads.map((t) => t.id)
  const [{ data: messages }, { data: threadLabels }] = await Promise.all([
    access.supabase
      .from('mailbox_messages')
      .select('id, thread_id, direction, from_address, subject, body_text, is_read, created_at')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: true }),
    access.supabase
      .from('mailbox_thread_labels')
      .select('thread_id, mailbox_labels(id, name, color)')
      .in('thread_id', threadIds),
  ])

  const data = threads.map((t) => {
    const threadMessages = (messages || []).filter((m) => m.thread_id === t.id)
    const last = threadMessages[threadMessages.length - 1]
    const unreadCount = threadMessages.filter((m) => m.direction === 'inbound' && !m.is_read).length
    const labels = (threadLabels || [])
      .filter((r) => r.thread_id === t.id)
      .map((r) => (Array.isArray(r.mailbox_labels) ? r.mailbox_labels[0] : r.mailbox_labels))
      .filter(Boolean)
    return {
      id: t.id,
      subject: t.subject,
      externalAddress: t.external_address,
      lastMessageAt: t.last_message_at,
      preview: last?.body_text?.slice(0, 140) || '',
      unreadCount,
      archived: !!t.archived_at,
      starred: !!t.starred_at,
      labels,
    }
  })

  return NextResponse.json({ data })
}

/** Compose — starts a brand new outbound thread to an external address. */
export async function POST(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const payload = await request.json()
  const { to, subject, body, bodyHtml, cc, bcc, attachments: rawAttachments, mailboxId: requestedMailboxId } = payload
  const toAddress = String(to || '').trim().toLowerCase()
  const subjectLine = String(subject || '').trim()
  const ccList = parseAddressList(cc)
  const bccList = parseAddressList(bcc)

  if (!EMAIL_RE.test(toAddress)) {
    return NextResponse.json({ error: 'A valid recipient address is required.' }, { status: 400 })
  }
  if (!subjectLine) return NextResponse.json({ error: 'A subject is required.' }, { status: 400 })

  const resolved = resolveMailboxId(access, requestedMailboxId ?? null)
  if ('error' in resolved) return resolved.error
  const { mailboxId } = resolved

  const parsedAtt = parseAttachmentRefs(rawAttachments, mailboxId)
  if (!parsedAtt.ok) return NextResponse.json({ error: parsedAtt.error }, { status: 400 })

  const { data: mailbox, error: mailboxError } = await access.supabase
    .from('partner_mailboxes')
    .select('id, address, display_name, signature_html')
    .eq('id', mailboxId)
    .single()
  if (mailboxError || !mailbox) return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 })

  const html = appendSignature(bodyHtml ? String(bodyHtml) : null, mailbox.signature_html)
  const text = html ? htmlToText(html) : String(body || '')
  if (!text.trim() && !html) return NextResponse.json({ error: 'Message body is required.' }, { status: 400 })

  const sendPayload: Record<string, unknown> = {
    from: `${mailbox.display_name || mailbox.address} <${mailbox.address}>`,
    to: toAddress,
    subject: subjectLine,
    text: text || undefined,
    html: html || undefined,
  }
  if (ccList.length) sendPayload.cc = ccList
  if (bccList.length) sendPayload.bcc = bccList
  if (parsedAtt.refs.length) sendPayload.attachments = await resendAttachmentsFromRefs(access.supabase, parsedAtt.refs)

  const { data: sent, error: sendError } = await resend.emails.send(sendPayload as never)
  if (sendError) {
    console.error('[mail compose] resend send failed', JSON.stringify(sendError), 'attachments:', parsedAtt.refs.map((a) => `${a.filename} ${a.size}b`))
    return NextResponse.json({ error: sendError.message || 'Failed to send email.' }, { status: 502 })
  }

  const nowIso = new Date().toISOString()
  const { data: thread, error: threadError } = await access.supabase
    .from('mailbox_threads')
    .insert({ mailbox_id: mailbox.id, subject: subjectLine, external_address: toAddress, last_message_at: nowIso })
    .select()
    .single()
  if (threadError || !thread) {
    return NextResponse.json({ error: threadError?.message || 'Failed to create thread.' }, { status: 500 })
  }

  const { data: inserted, error: insertError } = await access.supabase
    .from('mailbox_messages')
    .insert({
      thread_id: thread.id,
      mailbox_id: mailbox.id,
      direction: 'outbound',
      from_address: mailbox.address,
      to_address: toAddress,
      cc_addresses: ccList.length ? ccList : null,
      bcc_addresses: bccList.length ? bccList : null,
      subject: subjectLine,
      body_text: text || null,
      body_html: html || null,
      message_id_header: sent?.id ? `<${sent.id}@resend.dev>` : null,
      is_read: true,
    })
    .select('id')
    .single()
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  if (parsedAtt.refs.length && inserted?.id) {
    await persistOutboundAttachments(access.supabase, mailbox.id, inserted.id, parsedAtt.refs)
  }

  return NextResponse.json({ success: true, data: { id: thread.id } })
}
