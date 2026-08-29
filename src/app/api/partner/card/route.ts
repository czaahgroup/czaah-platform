import { NextRequest, NextResponse } from 'next/server'
import { requirePartner } from '@/lib/partnerAuth'


export async function GET(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { supabase, userId, partner } = auth

    const { data: profile } = await supabase!
      .from('profiles')
      .select('full_name, email, company_name, created_at')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://czaah.com'
    const qrData = `${baseUrl}/verify/partner/${partner!.id}`

    return NextResponse.json({
      fullName: profile.full_name,
      email: profile.email,
      companyName: profile.company_name || '',
      role: 'partner',
      memberId: partner!.partner_id,
      memberSince,
      qrData,
    })
  } catch (err) {
    console.error('Partner card API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
