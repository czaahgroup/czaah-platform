import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess, resolveMailboxId } from '@/lib/mailAuth'


const BLOCKED = /\.(exe|bat|cmd|com|scr|pif|msi|msp|dll|sys|cpl|hta|vbs|vbe|jse?|jar|wsf?|wsc|wsh|ps1|psm1|reg|inf|lnk|chm|app|gadget|msc|sh|run|apk|dmg)$/i

/**
 * Issues a one-shot signed upload URL so the browser can PUT an attachment
 * straight into the mailbox-attachments bucket — keeping large file bodies out
 * of the compose/reply API routes (edge body-size limits).
 */
export async function POST(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const { filename, mailboxId: requestedMailboxId } = await request.json()
  const name = String(filename || '').trim()
  if (!name) return NextResponse.json({ error: 'filename required' }, { status: 400 })
  if (BLOCKED.test(name)) {
    return NextResponse.json({ error: 'Email providers block executables and scripts — zip the file or share a link instead.' }, { status: 400 })
  }

  const resolved = resolveMailboxId(access, requestedMailboxId ?? null)
  if ('error' in resolved) return resolved.error

  const safe = name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180)
  const path = `outbound/${resolved.mailboxId}/${crypto.randomUUID()}/${safe}`

  const { data, error } = await access.supabase.storage
    .from('mailbox-attachments')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not create upload URL' }, { status: 500 })
  }
  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl, filename: safe })
}
