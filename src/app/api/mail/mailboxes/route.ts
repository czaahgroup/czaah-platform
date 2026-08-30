import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'
import { hashPassword } from '@/lib/webmailAuth'

const ADDRESS_RE = /^[a-z0-9._%+-]+@czaah\.com$/

/**
 * GET — super_admin: every mailbox; partner: just their own.
 * `?withPartners=1` (super_admin) also returns the partner roster with a
 * `hasMailbox` flag, for the "assign a partner mailbox" picker.
 */
export async function GET(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  let q = access.supabase
    .from('partner_mailboxes')
    .select('id, address, display_name, signature_html, partner_id, webmail_password_hash')
    .order('display_name', { ascending: true })

  if (!access.isSuperAdmin) {
    if (!access.ownMailboxId) return NextResponse.json({ data: [] })
    q = q.eq('id', access.ownMailboxId)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mailboxes = (data || []).map((m) => ({
    id: m.id,
    address: m.address,
    displayName: m.display_name,
    signatureHtml: m.signature_html || '',
    kind: m.partner_id ? 'partner' : 'team',
    partnerId: m.partner_id || null,
    webmailEnabled: !!m.webmail_password_hash,
  }))

  const wantPartners = new URL(request.url).searchParams.get('withPartners') === '1'
  if (!wantPartners || !access.isSuperAdmin) {
    return NextResponse.json({ data: mailboxes })
  }

  const { data: partners } = await access.supabase
    .from('partners')
    .select('id, partner_id, profiles!partners_profile_id_fkey(full_name, company_name, email)')
    .order('created_at', { ascending: false })

  const taken = new Set(mailboxes.filter((m) => m.partnerId).map((m) => m.partnerId))
  const partnerList = (partners || []).map((p: any) => ({
    id: p.id,
    code: p.partner_id,
    name: p.profiles?.full_name || p.profiles?.email || p.partner_id,
    company: p.profiles?.company_name || null,
    hasMailbox: taken.has(p.id),
  }))

  return NextResponse.json({ data: mailboxes, partners: partnerList })
}

/**
 * POST — create a mailbox (super_admin only).
 * Body: { address, displayName?, partnerId? }. With `partnerId` it's a
 * partner mailbox (one per partner); without, a team mailbox.
 */
export async function POST(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  if (!access.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const address = String(body.address || '').trim().toLowerCase()
  const displayName = String(body.displayName || '').trim() || null
  const partnerId = body.partnerId ? String(body.partnerId) : null

  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Address must look like name@czaah.com.' }, { status: 400 })
  }

  const { data: existing } = await access.supabase
    .from('partner_mailboxes')
    .select('id')
    .eq('address', address)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'That address already exists.' }, { status: 409 })

  if (partnerId) {
    const { data: partner } = await access.supabase
      .from('partners')
      .select('id')
      .eq('id', partnerId)
      .maybeSingle()
    if (!partner) return NextResponse.json({ error: 'Partner not found.' }, { status: 404 })

    const { data: partnerBox } = await access.supabase
      .from('partner_mailboxes')
      .select('id')
      .eq('partner_id', partnerId)
      .maybeSingle()
    if (partnerBox) return NextResponse.json({ error: 'That partner already has a mailbox.' }, { status: 409 })
  }

  const { data, error } = await access.supabase
    .from('partner_mailboxes')
    .insert({ address, display_name: displayName, partner_id: partnerId })
    .select('id, address, display_name, partner_id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: {
      id: data.id,
      address: data.address,
      displayName: data.display_name,
      kind: data.partner_id ? 'partner' : 'team',
      partnerId: data.partner_id || null,
    },
  })
}

/**
 * PATCH — super_admin: edit any mailbox's address / display name / signature.
 * partner: only their own mailbox's signature.
 */
export async function PATCH(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => ({}))
  const { mailboxId, signatureHtml, displayName, address, webmailPassword } = body

  const targetId = access.isSuperAdmin ? mailboxId : access.ownMailboxId
  if (!targetId) return NextResponse.json({ error: 'mailboxId is required' }, { status: 400 })
  if (!access.isSuperAdmin && mailboxId && mailboxId !== access.ownMailboxId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const patch: Record<string, unknown> = {}

  if (signatureHtml !== undefined) {
    patch.signature_html = typeof signatureHtml === 'string' ? signatureHtml.slice(0, 20000) : null
  }

  if (access.isSuperAdmin && displayName !== undefined) {
    patch.display_name = String(displayName || '').trim() || null
  }

  if (access.isSuperAdmin && webmailPassword !== undefined) {
    const pw = String(webmailPassword || '')
    if (pw === '') {
      patch.webmail_password_hash = null // disable webmail login
    } else if (pw.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    } else {
      patch.webmail_password_hash = await hashPassword(pw)
    }
  }

  if (access.isSuperAdmin && address !== undefined) {
    const next = String(address || '').trim().toLowerCase()
    if (!ADDRESS_RE.test(next)) {
      return NextResponse.json({ error: 'Address must look like name@czaah.com.' }, { status: 400 })
    }
    const { data: clash } = await access.supabase
      .from('partner_mailboxes')
      .select('id')
      .eq('address', next)
      .neq('id', targetId)
      .maybeSingle()
    if (clash) return NextResponse.json({ error: 'That address is already in use.' }, { status: 409 })
    patch.address = next
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { error } = await access.supabase
    .from('partner_mailboxes')
    .update(patch)
    .eq('id', targetId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

/**
 * DELETE — remove a mailbox and all its threads/messages (super_admin only).
 * `?mailboxId=…`. Deleting a partner mailbox also requires `&confirmPartner=1`.
 */
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

  if (mb.partner_id && searchParams.get('confirmPartner') !== '1') {
    return NextResponse.json(
      { error: 'This is a partner mailbox. Deleting it also removes the partner’s mail history — resend with confirmation.' },
      { status: 409 }
    )
  }

  const { error } = await access.supabase.from('partner_mailboxes').delete().eq('id', mailboxId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
