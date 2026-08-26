import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'

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
      password,
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
      identityDocument,
    } = body

    // Validate required fields
    if (!fullName || !email || !password || !phone || !nationality || !currentLocation || !tradeCategory || !specificRole) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, email, password, phone, nationality, currentLocation, tradeCategory, specificRole' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (!identityDocument || typeof identityDocument !== 'string') {
      return NextResponse.json(
        { error: 'An identity document (CNIC/Passport copy) is required to register.' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Insert profile
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: userId,
      full_name: fullName,
      email,
      phone,
      role: 'worker',
      status: 'pending_kyc_review',
    })

    if (profileError) {
      console.error('Profile insert error:', JSON.stringify(profileError))
      await adminClient.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create profile. Please try again.' }, { status: 500 })
    }

    // Upload photo, if provided (display photo — not an identity/KYC document)
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

    // 3. Upload identity document into the unified KYC bucket
    const docMatch = identityDocument.match(/^data:([^;]+);base64,(.+)$/)
    const docContentType = docMatch ? docMatch[1] : 'application/octet-stream'
    const docBase64Data = docMatch ? docMatch[2] : identityDocument
    const docBuffer = Buffer.from(docBase64Data, 'base64')
    const docPath = `${userId}/identity_document`
    const { error: docUploadError } = await adminClient.storage
      .from('kyc-documents')
      .upload(docPath, docBuffer, { contentType: docContentType, upsert: true })

    if (docUploadError) {
      console.error('Failed to upload identity document:', docUploadError.message)
      return NextResponse.json({ error: 'Failed to upload identity document. Please try again.' }, { status: 500 })
    }

    const { error: kycDocError } = await adminClient.from('kyc_documents').insert({
      user_id: userId,
      document_type: 'identity_document',
      file_url: docPath,
      review_status: 'pending',
    })

    if (kycDocError) {
      console.error('KYC document record error:', kycDocError)
      return NextResponse.json({ error: 'Failed to record identity document. Please try again.' }, { status: 500 })
    }

    // 4. Insert the workforce registry row, linked to the account
    const { error: registryError } = await adminClient
      .from('workforce_registry')
      .insert({
        profile_id: userId,
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

    if (registryError) {
      console.error('Workforce registry insert error:', registryError)
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }

    // 5. Default notification preferences
    await adminClient.from('notification_preferences').insert({ user_id: userId })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/public/workforce/register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
