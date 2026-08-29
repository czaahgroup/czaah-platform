import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess, resolveMailboxId } from '@/lib/mailAuth'


export async function GET(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const resolved = resolveMailboxId(access, request.nextUrl.searchParams.get('mailboxId'))
  if ('error' in resolved) return resolved.error

  // Shared (org-wide) templates + this mailbox's own.
  const { data, error } = await access.supabase
    .from('mail_templates')
    .select('id, mailbox_id, name, category, subject, body_html, is_shared, updated_at')
    .or(`is_shared.eq.true,mailbox_id.eq.${resolved.mailboxId}`)
    .order('is_shared', { ascending: false })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    data: (data || []).map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      subject: t.subject,
      bodyHtml: t.body_html,
      isShared: t.is_shared,
      scope: t.is_shared ? 'shared' : 'personal',
    })),
  })
}

export async function POST(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const { name, category, subject, bodyHtml, isShared, mailboxId: requestedMailboxId } = await request.json()
  const trimmed = String(name || '').trim().slice(0, 80)
  if (!trimmed) return NextResponse.json({ error: 'A template name is required.' }, { status: 400 })

  const shared = !!isShared && access.isSuperAdmin
  let mailboxId: string | null = null
  if (!shared) {
    const resolved = resolveMailboxId(access, requestedMailboxId ?? null)
    if ('error' in resolved) return resolved.error
    mailboxId = resolved.mailboxId
  }

  const { data, error } = await access.supabase
    .from('mail_templates')
    .insert({
      mailbox_id: mailboxId,
      created_by: access.userId,
      name: trimmed,
      category: category ? String(category).slice(0, 40) : null,
      subject: subject ? String(subject).slice(0, 300) : null,
      body_html: String(bodyHtml || '').slice(0, 40000),
      is_shared: shared,
    })
    .select('id, name, category, subject, body_html, is_shared')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({
    data: { id: data.id, name: data.name, category: data.category, subject: data.subject, bodyHtml: data.body_html, isShared: data.is_shared, scope: data.is_shared ? 'shared' : 'personal' },
  })
}
