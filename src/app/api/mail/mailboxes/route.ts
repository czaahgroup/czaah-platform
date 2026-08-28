import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  if (!access.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await access.supabase
    .from('partner_mailboxes')
    .select('id, address, display_name')
    .order('display_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: (data || []).map((m) => ({
      id: m.id,
      address: m.address,
      displayName: m.display_name,
    })),
  })
}
