import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'


/** super_admin: every mailbox. partner: just their own. */
export async function GET(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  let q = access.supabase
    .from('partner_mailboxes')
    .select('id, address, display_name, signature_html, partner_id')
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
      kind: m.partner_id ? 'partner' : 'team',
    })),
  })
}

/** Create a team mailbox (super_admin only). */
export async function POST(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  if (!access.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const address = String(body.address || '').trim().toLowerCase()
  const displayName = String(body.displayName || '').trim() || null

  if (!/^[a-z0-9._%+-]+@czaah\.com$/.test(address)) {
    return NextResponse.json({ error: 'Address must look like name@czaah.com.' }, { status: 400 })
  }

  const { data: existing } = await access.supabase
    .from('partner_mailboxes')
    .select('id')
    .eq('address', address)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'That address already exists.' }, { status: 409 })

  const { data, error } = await access.supabase
    .from('partner_mailboxes')
    .insert({ address, display_name: displayName, partner_id: null })
    .select('id, address, display_name')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: { id: data.id, address: data.address, displayName: data.display_name, kind: 'team' },
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

/** Delete a team mailbox (super_admin only). Partner mailboxes are refused. */
export async function DELETE(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  if (!access.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const mailboxId = searchParams.get('mailboxId')
  if (!mailboxId) return NextResponse.json({ error: 'mailboxId is required' }, { status: 400 })

  const { data: mb } = await access.supabase
    .from('partner_mailboxes')
    .select('id, partner_id')
    .eq('id', mailboxId)
    .maybeSingle()
  if (!mb) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 })
  if (mb.partner_id) {
    return NextResponse.json(
      { error: 'This mailbox belongs to a partner — manage it from the Partners area.' },
      { status: 400 }
    )
  }

  const { error } = await access.supabase.from('partner_mailboxes').delete().eq('id', mailboxId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
