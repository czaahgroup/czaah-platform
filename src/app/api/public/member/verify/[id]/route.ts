import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

function getTierLabel(role: string): string {
  switch (role) {
    case 'super_admin': return 'Admin'
    case 'admin': return 'Admin'
    case 'elite_member': return 'Elite Member'
    case 'real_estate_partner': return 'Real Estate Partner'
    default: return 'Member'
  }
}

// Public membership card verification lookup — deliberately returns only
// non-sensitive fields (no email, phone, or other account details).
// Anyone with the QR code / share link can confirm someone holds a
// genuine CZAAH membership.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('profiles')
      .select('id, full_name, company_name, role, status, created_at')
      .eq('id', id)
      .single()

    if (error || !data || data.status !== 'approved') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        full_name: data.full_name,
        company_name: data.company_name,
        tier: getTierLabel(data.role),
        member_id: data.id.replace(/-/g, '').substring(0, 8).toUpperCase(),
        created_at: data.created_at,
      },
    })
  } catch (err) {
    console.error('GET /api/public/member/verify/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
