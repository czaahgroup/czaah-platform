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
      photo,
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

    // Upload photo, if provided
    let photoUrl: string | null = null
    if (photo && typeof photo === 'string') {
      const match = photo.match(/^data:([^;]+);base64,(.+)$/)
      const contentType = match ? match[1] : 'image/jpeg'
      const base64Data = match ? match[2] : photo
      if (contentType.startsWith('image/')) {
        const buffer = Buffer.from(base64Data, 'base64')
        const ext = contentType.split('/')[1] || 'jpg'
        const filePath = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: uploadError } = await adminClient.storage
          .from('worker-photos')
          .upload(filePath, buffer, { contentType, upsert: false })
        if (!uploadError) {
          photoUrl = filePath
        } else {
          console.error('Failed to upload worker photo:', uploadError.message)
        }
      }
    }

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
        photo_url: photoUrl,
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
