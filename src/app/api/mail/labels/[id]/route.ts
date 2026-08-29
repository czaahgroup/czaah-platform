import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'


export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  const { id } = await params

  const { data: label } = await access.supabase
    .from('mailbox_labels')
    .select('id, mailbox_id')
    .eq('id', id)
    .maybeSingle()
  if (!label) return NextResponse.json({ error: 'Label not found' }, { status: 404 })
  if (!access.isSuperAdmin && label.mailbox_id !== access.ownMailboxId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await access.supabase.from('mailbox_labels').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
