import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'


async function loadOwned(access: any, id: string) {
  const { data: tpl } = await access.supabase
    .from('mail_templates')
    .select('id, mailbox_id, is_shared')
    .eq('id', id)
    .maybeSingle()
  if (!tpl) return { error: NextResponse.json({ error: 'Template not found' }, { status: 404 }) }
  const ownsMailbox = !tpl.is_shared && tpl.mailbox_id === access.ownMailboxId
  if (!access.isSuperAdmin && !ownsMailbox) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { tpl }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const { id } = await params
  const owned = await loadOwned(access, id)
  if ('error' in owned) return owned.error

  const body = await request.json()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.name === 'string') patch.name = body.name.trim().slice(0, 80)
  if ('category' in body) patch.category = body.category ? String(body.category).slice(0, 40) : null
  if ('subject' in body) patch.subject = body.subject ? String(body.subject).slice(0, 300) : null
  if (typeof body.bodyHtml === 'string') patch.body_html = body.bodyHtml.slice(0, 40000)

  const { error } = await access.supabase.from('mail_templates').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const { id } = await params
  const owned = await loadOwned(access, id)
  if ('error' in owned) return owned.error

  const { error } = await access.supabase.from('mail_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
