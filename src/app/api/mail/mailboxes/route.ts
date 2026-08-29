import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'


/** super_admin: every mailbox. partner: just their own. */
export async function GET(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  let q = access.supabase
    .from('partner_mailboxes')
    .select('id, address, display_name, signature_html')
    .order('display_name', { ascending: true })

  if (!access.isSuperAdmin) {
    if (!access.ownMailboxId) return NextResponse.json({ data: [] })
    q = q.eq('id', access.ownMailboxId)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: (data || []).map((m) => ({
      id: m.id,
      address: m.address,
      displayName: m.display_name,
      signatureHtml: m.signature_html || '',
    })),
  })
}

/** Update the signature for a mailbox (own mailbox, or any for super_admin). */
export async function PATCH(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const { mailboxId, signatureHtml } = await request.json()
  const targetId = access.isSuperAdmin ? mailboxId : access.ownMailboxId
  if (!targetId) return NextResponse.json({ error: 'mailboxId is required' }, { status: 400 })
  if (!access.isSuperAdmin && mailboxId && mailboxId !== access.ownMailboxId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const value = typeof signatureHtml === 'string' ? signatureHtml.slice(0, 20000) : null

  const { error } = await access.supabase
    .from('partner_mailboxes')
    .update({ signature_html: value })
    .eq('id', targetId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
