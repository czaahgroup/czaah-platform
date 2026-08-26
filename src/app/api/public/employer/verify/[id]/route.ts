import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public employer verification lookup — deliberately returns only
// non-sensitive fields (no email, phone, contact person, roles needed, notes).
// Anyone with the reference link (e.g. via QR code) can confirm a
// company is a genuine CZAAH-registered employer.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('employer_registry')
      .select('id, company_name, industry, country, status, created_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...data,
        reference: `ER-${data.id.substring(0, 6).toUpperCase()}`,
      },
    })
  } catch (err) {
    console.error('GET /api/public/employer/verify/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
