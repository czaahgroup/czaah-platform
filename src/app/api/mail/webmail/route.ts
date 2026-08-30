import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  WEBMAIL_COOKIE,
  WEBMAIL_COOKIE_OPTIONS,
  verifyPassword,
  signWebmailSession,
  verifyWebmailSession,
} from '@/lib/webmailAuth'

/** GET — current webmail session, if any. */
export async function GET(request: NextRequest) {
  const session = await verifyWebmailSession(request.cookies.get(WEBMAIL_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // make sure the mailbox still exists
  const supabase = createAdminClient()
  const { data: mailbox } = await supabase
    .from('partner_mailboxes')
    .select('id, address, display_name')
    .eq('id', session.mailboxId)
    .maybeSingle()
  if (!mailbox) {
    const res = NextResponse.json({ error: 'Mailbox no longer exists' }, { status: 401 })
    res.cookies.set(WEBMAIL_COOKIE, '', { ...WEBMAIL_COOKIE_OPTIONS, maxAge: 0 })
    return res
  }

  return NextResponse.json({ address: mailbox.address, displayName: mailbox.display_name })
}

/** POST — sign in with { address, password }. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const address = String(body.address || '').trim().toLowerCase()
  const password = String(body.password || '')

  const fail = () => NextResponse.json({ error: 'Wrong address or password.' }, { status: 401 })

  if (!address || !password) return fail()

  const supabase = createAdminClient()
  const { data: mailbox } = await supabase
    .from('partner_mailboxes')
    .select('id, address, webmail_password_hash')
    .eq('address', address)
    .maybeSingle()

  // Always run a verify to keep timing roughly constant whether or not the
  // address exists / has webmail enabled.
  const ok = await verifyPassword(password, mailbox?.webmail_password_hash || null)
  if (!mailbox || !mailbox.webmail_password_hash || !ok) {
    await new Promise((r) => setTimeout(r, 400))
    return fail()
  }

  const token = await signWebmailSession(mailbox.id, mailbox.address)
  const res = NextResponse.json({ address: mailbox.address })
  res.cookies.set(WEBMAIL_COOKIE, token, WEBMAIL_COOKIE_OPTIONS)
  return res
}

/** DELETE — sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(WEBMAIL_COOKIE, '', { ...WEBMAIL_COOKIE_OPTIONS, maxAge: 0 })
  return res
}
