import { NextRequest, NextResponse } from 'next/server'
import { requirePartner } from '@/lib/partnerAuth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error

    const { data, error } = await auth.supabase!
      .from('partner_sector_access')
      .select('sectors(id, name)')
      .eq('partner_id', auth.partner!.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const sectors = (data || []).map((row: { sectors: { id: string; name: string } }) => row.sectors).filter(Boolean)
    return NextResponse.json({ data: sectors })
  } catch (err) {
    console.error('GET /api/partner/sectors error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
