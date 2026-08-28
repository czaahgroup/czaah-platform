import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess, resolveMailboxId } from '@/lib/mailAuth'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const resolved = resolveMailboxId(access, request.nextUrl.searchParams.get('mailboxId'))
  if ('error' in resolved) return resolved.error
  const { mailboxId } = resolved

  const { data: threads, error } = await access.supabase
    .from('mailbox_threads')
    .select('id, subject, external_address, last_message_at')
    .eq('mailbox_id', mailboxId)
    .order('last_message_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!threads?.length) return NextResponse.json({ data: [] })

  const threadIds = threads.map((t) => t.id)
  const { data: messages } = await access.supabase
    .from('mailbox_messages')
    .select('id, thread_id, direction, from_address, subject, body_text, is_read, created_at')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: true })

  const data = threads.map((t) => {
    const threadMessages = (messages || []).filter((m) => m.thread_id === t.id)
    const last = threadMessages[threadMessages.length - 1]
    const unreadCount = threadMessages.filter((m) => m.direction === 'inbound' && !m.is_read).length
    return {
      id: t.id,
      subject: t.subject,
      externalAddress: t.external_address,
      lastMessageAt: t.last_message_at,
      preview: last?.body_text?.slice(0, 140) || '',
      unreadCount,
    }
  })

  return NextResponse.json({ data })
}
