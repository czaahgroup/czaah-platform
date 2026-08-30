import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { WEBMAIL_COOKIE, verifyWebmailSession } from '@/lib/webmailAuth'

function createAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
}

/**
 * Resolves mail access for either a partner (scoped to their own mailbox)
 * or a super_admin (can view any mailbox, chosen via ?mailboxId=). Every
 * /api/mail/* route uses this so partners can never see another partner's
 * mailbox and non-super_admin/non-partner roles are rejected outright.
 */
export async function requireMailAccess(request: NextRequest) {
  const userClient = createAuthClient(request)
  const { data: { user } } = await userClient.auth.getUser()

  if (!user) {
    // Webmail session — a per-mailbox password login, scoped to that one mailbox.
    const webmail = await verifyWebmailSession(request.cookies.get(WEBMAIL_COOKIE)?.value)
    if (webmail) {
      const supabase = createAdminClient()
      const { data: mailbox } = await supabase
        .from('partner_mailboxes')
        .select('id, address')
        .eq('id', webmail.mailboxId)
        .maybeSingle()
      if (!mailbox) {
        return { error: NextResponse.json({ error: 'Mailbox no longer exists' }, { status: 401 }) }
      }
      return {
        supabase,
        userId: null,
        isSuperAdmin: false as const,
        isWebmail: true as const,
        ownMailboxId: mailbox.id,
        ownMailboxAddress: mailbox.address,
      }
    }
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  if (profile.role === 'super_admin') {
    return { supabase, userId: user.id, isSuperAdmin: true as const, ownMailboxId: null }
  }

  if (profile.role !== 'partner') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const { data: partner } = await supabase.from('partners').select('id, status').eq('profile_id', user.id).single()
  if (!partner) {
    return { error: NextResponse.json({ error: 'Partner record not found' }, { status: 404 }) }
  }
  if (partner.status === 'suspended') {
    return { error: NextResponse.json({ error: 'This partner account has been suspended' }, { status: 403 }) }
  }

  const { data: mailbox } = await supabase.from('partner_mailboxes').select('id, address, display_name').eq('partner_id', partner.id).single()

  return { supabase, userId: user.id, isSuperAdmin: false as const, ownMailboxId: mailbox?.id || null, ownMailboxAddress: mailbox?.address || null }
}

/** Resolves which mailbox_id a request should operate on, given the query param and the caller's access level. */
export function resolveMailboxId(
  access: Awaited<ReturnType<typeof requireMailAccess>>,
  requestedMailboxId: string | null
): { mailboxId: string } | { error: NextResponse } {
  if ('error' in access) return { error: access.error }
  if (access.isSuperAdmin) {
    if (!requestedMailboxId) return { error: NextResponse.json({ error: 'mailboxId is required' }, { status: 400 }) }
    return { mailboxId: requestedMailboxId }
  }
  if (!access.ownMailboxId) return { error: NextResponse.json({ error: 'No mailbox assigned to this account' }, { status: 404 }) }
  return { mailboxId: access.ownMailboxId }
}
