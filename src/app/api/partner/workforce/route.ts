import { NextRequest, NextResponse } from 'next/server'
import { requirePartner, hasWorkforceSectorAccess } from '@/lib/partnerAuth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error

    const { data, error } = await auth.supabase!
      .from('workforce_registry')
      .select('*')
      .eq('partner_id', auth.partner!.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/partner/workforce error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { supabase, partner } = auth

    // Server-side enforcement — not just a hidden nav link.
    if (!(await hasWorkforceSectorAccess(supabase!, partner!.id))) {
      return NextResponse.json({ error: 'You are not authorised to submit workforce candidates' }, { status: 403 })
    }

    const body = await request.json()
    const {
      fullName, email, phone, nationality, currentLocation, tradeCategory, specificRole,
      yearsExperience, certifications, preferredDestinations, availability,
      passportStatus, medicalStatus, notes,
    } = body

    if (!fullName || !email || !phone || !nationality || !currentLocation || !tradeCategory || !specificRole) {
      return NextResponse.json(
        { error: 'fullName, email, phone, nationality, currentLocation, tradeCategory, and specificRole are required' },
        { status: 400 }
      )
    }

    const { data: candidate, error } = await supabase!
      .from('workforce_registry')
      .insert({
        partner_id: partner!.id,
        full_name: fullName,
        email,
        phone,
        nationality,
        current_location: currentLocation,
        trade_category: tradeCategory,
        specific_role: specificRole,
        years_experience: yearsExperience || 0,
        certifications: certifications || null,
        preferred_destinations: Array.isArray(preferredDestinations) ? preferredDestinations : [],
        availability: availability || 'immediate',
        passport_status: passportStatus || 'valid',
        medical_status: medicalStatus || 'not_done',
        notes: notes || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: candidate })
  } catch (err) {
    console.error('POST /api/partner/workforce error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
