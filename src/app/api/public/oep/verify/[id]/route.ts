import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public Employment Promoter verification lookup — deliberately returns only
// non-sensitive fields (no email, phone, contact person, notes). License
// number is intentionally included since verifying it is the whole point.
// Anyone with the reference link (e.g. via QR code) can confirm an agency
// is a genuine CZAAH-registered Overseas Employment Promoter.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('oep_registry')
      .select('id, company_name, license_number, head_office_location, years_in_operation, status, created_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...data,
        reference: `OEP-${data.id.substring(0, 6).toUpperCase()}`,
      },
    })
  } catch (err) {
    console.error('GET /api/public/oep/verify/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
