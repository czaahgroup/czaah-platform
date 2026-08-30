import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { logError } from '@/lib/logError'

/** GET /api/crm/contacts/[id]/emails — mail threads linked to this contact. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const { id } = await params

    // confirm the caller can see this contact
    let cq = access.supabase.from('crm_contacts').select('id, email').eq('id', id)
    cq = scopeQuery(cq, access, ['owner_id', 'created_by', 'profile_id'])
    const { data: contact } = await cq.maybeSingle()
    if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })

    const { data: links } = await access.supabase
      .from('crm_links')
      .select('source_id')
      .eq('contact_id', id)
      .eq('source_type', 'mail_thread')
    const threadIds = (links || []).map((l) => l.source_id)
    if (!threadIds.length) return NextResponse.json({ data: [] })

    const { data: threads, error } = await access.supabase
      .from('mailbox_threads')
      .select('id, subject, external_address, last_message_at, created_at, mailbox:partner_mailboxes(address), messages:mailbox_messages(direction, created_at, body_text)')
      .in('id', threadIds)
      .order('last_message_at', { ascending: false })
    if (error) throw error

    const data = (threads || []).map((t: any) => {
      const msgs = (t.messages || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const last = msgs[0]
      return {
        id: t.id,
        subject: t.subject,
        with: t.external_address,
        mailbox: t.mailbox?.address,
        lastAt: t.last_message_at || t.created_at,
        messageCount: msgs.length,
        lastDirection: last?.direction,
        preview: last?.body_text ? String(last.body_text).replace(/\s+/g, ' ').slice(0, 140) : null,
      }
    })
    return NextResponse.json({ data })
  } catch (err) {
    logError('api.crm.contacts.emails', err)
    return NextResponse.json({ error: 'Could not load the email history.' }, { status: 500 })
  }
}
