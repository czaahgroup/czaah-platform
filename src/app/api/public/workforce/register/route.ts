import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 per hour per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { success } = rateLimit(`workforce-register:${ip}`, 5, 60 * 60 * 1000)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      fullName,
      email,
      phone,
      nationality,
      currentLocation,
      tradeCategory,
      specificRole,
      yearsExperience,
      certifications,
      preferredDestinations,
      availability,
      passportStatus,
      medicalStatus,
      notes,
    } = body

    // Validate required fields
    if (!fullName || !email || !phone || !nationality || !currentLocation || !tradeCategory || !specificRole) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, email, phone, nationality, currentLocation, tradeCategory, specificRole' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('workforce_registry')
      .insert({
        full_name: fullName,
        email,
        phone,
        nationality,
        current_location: currentLocation,
        trade_category: tradeCategory,
        specific_role: specificRole,
        years_experience: yearsExperience || 0,
        certifications: certifications || null,
        preferred_destinations: preferredDestinations || [],
        availability: availability || 'immediate',
        passport_status: passportStatus || 'valid',
        medical_status: medicalStatus || 'not_done',
        notes: notes || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Workforce registration error:', error)
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }

    const refCode = `WR-${data.id.substring(0, 6).toUpperCase()}`

    return NextResponse.json({
      success: true,
      message: `Registration submitted successfully. Reference: ${refCode}`,
      reference: refCode,
    })
  } catch (err) {
    console.error('POST /api/public/workforce/register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
