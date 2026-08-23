import { NextRequest, NextResponse } from 'next/server'
import { requirePartner } from '@/lib/partnerAuth'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error

    const { data: profile, error } = await auth.supabase!
      .from('profiles')
      .select('full_name, email, phone, company_name')
      .eq('id', auth.userId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      profile,
      partnerId: auth.partner!.partner_id,
      referralCode: auth.partner!.referral_code,
    })
  } catch (err) {
    console.error('GET /api/partner/profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { fullName, phone, companyName } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (fullName !== undefined) updates.full_name = fullName
    if (phone !== undefined) updates.phone = phone
    if (companyName !== undefined) updates.company_name = companyName

    const { error } = await auth.supabase!.from('profiles').update(updates).eq('id', auth.userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/partner/profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
