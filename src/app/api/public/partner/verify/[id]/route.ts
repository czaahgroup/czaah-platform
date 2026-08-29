import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'


// Public partner card verification lookup — deliberately returns only
// non-sensitive fields. Anyone with the QR code / share link can confirm
// someone holds a genuine CZAAH Partner Network membership.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('partners')
      .select('id, partner_id, status, created_at, profiles!partners_profile_id_fkey(full_name, company_name)')
      .eq('id', id)
      .single()

    if (error || !data || data.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const profile = data.profiles as unknown as { full_name: string; company_name: string | null } | null

    return NextResponse.json({
      data: {
        full_name: profile?.full_name || '',
        company_name: profile?.company_name || null,
        partner_id: data.partner_id,
        created_at: data.created_at,
      },
    })
  } catch (err) {
    console.error('GET /api/public/partner/verify/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
