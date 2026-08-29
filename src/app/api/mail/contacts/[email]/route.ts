import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'
import { enrichEmails, normEmail } from '@/lib/mailContacts'


async function scopedThreads(access: any, email: string) {
  let q = access.supabase
    .from('mailbox_threads')
    .select('id, subject, mailbox_id, last_message_at, archived_at, partner_mailboxes(address, display_name)')
    .ilike('external_address', email)
    .is('deleted_at', null)
    .order('last_message_at', { ascending: false })
  if (!access.isSuperAdmin) q = q.eq('mailbox_id', access.ownMailboxId)
  const { data } = await q
  return data || []
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const email = normEmail(decodeURIComponent((await params).email))
  if (!email) return NextResponse.json({ error: 'Bad email' }, { status: 400 })

  const threads = await scopedThreads(access, email)
  if (!access.isSuperAdmin && threads.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [{ data: annotation }, enrichment] = await Promise.all([
    access.supabase.from('mail_contacts').select('*').eq('email', email).maybeSingle(),
    enrichEmails(access.supabase, [email]),
  ])
  const e = enrichment.get(email)

  return NextResponse.json({
    contact: {
      email,
      name: annotation?.name || e?.fullName || '',
      company: annotation?.company || e?.company || '',
      phone: annotation?.phone || e?.phone || '',
      title: annotation?.title || '',
      status: annotation?.status || 'active',
      notes: annotation?.notes || '',
      tags: annotation?.tags || [],
      annotated: !!annotation,
      enrichment: e
        ? { partnerRef: e.partnerRef || null, country: e.country || null, website: e.website || null, role: e.role || null }
        : null,
    },
    threads: threads.map((t) => {
      const mb = Array.isArray(t.partner_mailboxes) ? t.partner_mailboxes[0] : t.partner_mailboxes
      return {
        id: t.id,
        subject: t.subject,
        mailboxId: t.mailbox_id,
        mailboxAddress: mb?.address,
        lastMessageAt: t.last_message_at,
        archived: !!t.archived_at,
      }
    }),
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const email = normEmail(decodeURIComponent((await params).email))
  if (!email) return NextResponse.json({ error: 'Bad email' }, { status: 400 })

  if (!access.isSuperAdmin) {
    const threads = await scopedThreads(access, email)
    if (threads.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const b = await request.json()
  const row: Record<string, unknown> = { email, updated_at: new Date().toISOString(), created_by: access.userId }
  if ('name' in b) row.name = b.name ? String(b.name).slice(0, 160) : null
  if ('company' in b) row.company = b.company ? String(b.company).slice(0, 160) : null
  if ('phone' in b) row.phone = b.phone ? String(b.phone).slice(0, 60) : null
  if ('title' in b) row.title = b.title ? String(b.title).slice(0, 120) : null
  if ('notes' in b) row.notes = b.notes ? String(b.notes).slice(0, 8000) : null
  if ('status' in b) {
    const s = String(b.status)
    row.status = ['active', 'lead', 'client', 'vendor', 'archived'].includes(s) ? s : 'active'
  }
  if ('tags' in b) {
    row.tags = Array.isArray(b.tags) ? b.tags.map((t: unknown) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 20) : null
  }

  const { error } = await access.supabase.from('mail_contacts').upsert(row, { onConflict: 'email' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
