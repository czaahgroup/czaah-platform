import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


// Public worker verification lookup — deliberately returns only
// non-sensitive fields (no email, phone, passport/medical status, notes).
// Anyone with the reference link (e.g. via QR code) can confirm a
// worker is a genuine CZAAH-registered candidate.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('workforce_registry')
      .select('id, full_name, nationality, trade_category, specific_role, photo_url, status, created_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...data,
        reference: `WR-${data.id.substring(0, 6).toUpperCase()}`,
      },
    })
  } catch (err) {
    logError("api.public.workforce.verify.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
