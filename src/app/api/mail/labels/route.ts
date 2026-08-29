import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess, resolveMailboxId } from '@/lib/mailAuth'


export async function GET(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const resolved = resolveMailboxId(access, request.nextUrl.searchParams.get('mailboxId'))
  if ('error' in resolved) return resolved.error

  const { data, error } = await access.supabase
    .from('mailbox_labels')
    .select('id, name, color')
    .eq('mailbox_id', resolved.mailboxId)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

export async function POST(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  const { name, color, mailboxId: requestedMailboxId } = await request.json()
  const trimmed = String(name || '').trim().slice(0, 40)
  if (!trimmed) return NextResponse.json({ error: 'A label name is required.' }, { status: 400 })
  const hex = /^#[0-9a-fA-F]{6}$/.test(String(color || '')) ? String(color) : '#e6c364'

  const resolved = resolveMailboxId(access, requestedMailboxId ?? null)
  if ('error' in resolved) return resolved.error

  const { data, error } = await access.supabase
    .from('mailbox_labels')
    .insert({ mailbox_id: resolved.mailboxId, name: trimmed, color: hex })
    .select('id, name, color')
    .single()

  if (error) {
    const msg = error.code === '23505' ? 'A label with that name already exists.' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ data })
}
