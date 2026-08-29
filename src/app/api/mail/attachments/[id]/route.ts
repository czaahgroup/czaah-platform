import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'


/** Returns a short-lived signed download URL for one mailbox attachment. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const { id } = await params

  const { data: att } = await access.supabase
    .from('mailbox_attachments')
    .select('storage_path, filename, mailbox_messages(mailbox_id)')
    .eq('id', id)
    .maybeSingle()
  if (!att) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })

  const msgRel = Array.isArray(att.mailbox_messages) ? att.mailbox_messages[0] : att.mailbox_messages
  if (!access.isSuperAdmin && msgRel?.mailbox_id !== access.ownMailboxId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: signed, error } = await access.supabase.storage
    .from('mailbox-attachments')
    .createSignedUrl(att.storage_path, 3600, { download: att.filename || true })

  if (error || !signed) {
    return NextResponse.json({ error: error?.message || 'Failed to sign URL' }, { status: 500 })
  }
  return NextResponse.json({ url: signed.signedUrl, filename: att.filename })
}
