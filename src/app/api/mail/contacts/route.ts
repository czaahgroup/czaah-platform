import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess, resolveMailboxId } from '@/lib/mailAuth'
import { enrichEmails, normEmail } from '@/lib/mailContacts'


/**
 * Contact directory — one entry per external address the caller has
 * corresponded with (their mailbox, or any mailbox for super_admin with
 * ?mailboxId=, or all mailboxes for super_admin with no mailboxId).
 */
export async function GET(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const params = request.nextUrl.searchParams
  const q = (params.get('q') || '').trim().toLowerCase()

  let threadQ = access.supabase
    .from('mailbox_threads')
    .select('external_address, last_message_at, mailbox_id')
    .is('deleted_at', null)

  if (!access.isSuperAdmin) {
    if (!access.ownMailboxId) return NextResponse.json({ data: [] })
    threadQ = threadQ.eq('mailbox_id', access.ownMailboxId)
  } else if (params.get('mailboxId')) {
    threadQ = threadQ.eq('mailbox_id', params.get('mailboxId'))
  }

  const { data: threads, error } = await threadQ
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const agg = new Map<string, { threads: number; lastAt: string }>()
  for (const t of threads || []) {
    const email = normEmail(t.external_address)
    if (!email) continue
    const cur = agg.get(email) || { threads: 0, lastAt: '' }
    cur.threads += 1
    if (!cur.lastAt || t.last_message_at > cur.lastAt) cur.lastAt = t.last_message_at
    agg.set(email, cur)
  }

  const emails = [...agg.keys()]
  if (!emails.length) return NextResponse.json({ data: [] })

  const [{ data: annotations }, enrichment] = await Promise.all([
    access.supabase.from('mail_contacts').select('*').in('email', emails),
    enrichEmails(access.supabase, emails),
  ])
  const annByEmail = new Map((annotations || []).map((a) => [normEmail(a.email), a]))

  let rows = emails.map((email) => {
    const a = annByEmail.get(email)
    const e = enrichment.get(email)
    const stat = agg.get(email)!
    return {
      email,
      name: a?.name || e?.fullName || null,
      company: a?.company || e?.company || null,
      phone: a?.phone || e?.phone || null,
      title: a?.title || null,
      status: a?.status || 'active',
      tags: a?.tags || [],
      partnerRef: e?.partnerRef || null,
      threadCount: stat.threads,
      lastContactAt: stat.lastAt,
      annotated: !!a,
    }
  })

  if (q) {
    rows = rows.filter(
      (r) =>
        r.email.includes(q) ||
        (r.name || '').toLowerCase().includes(q) ||
        (r.company || '').toLowerCase().includes(q) ||
        (r.tags || []).some((t: string) => t.toLowerCase().includes(q))
    )
  }

  rows.sort((a, b) => (a.lastContactAt < b.lastContactAt ? 1 : -1))
  return NextResponse.json({ data: rows })
}
