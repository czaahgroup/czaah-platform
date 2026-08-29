import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'


export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 per hour per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { success } = rateLimit(`oep-register:${ip}`, 5, 60 * 60 * 1000)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      companyName,
      licenseNumber,
      contactPerson,
      email,
      password,
      phone,
      headOfficeLocation,
      yearsInOperation,
      sectorsSpecialization,
      destinationCountries,
      monthlyPlacementCapacity,
      companyWebsite,
      notes,
      identityDocument,
    } = body

    // Validate required fields
    if (!companyName || !licenseNumber || !contactPerson || !email || !password || !phone || !headOfficeLocation) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName, licenseNumber, contactPerson, email, password, phone, headOfficeLocation' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (!identityDocument || typeof identityDocument !== 'string') {
      return NextResponse.json(
        { error: 'A copy of your OEP license certificate is required to register.' },
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
      full_name: contactPerson,
      email,
      phone,
      company_name: companyName,
      company_website: companyWebsite || null,
      role: 'oep_partner',
      status: 'pending_kyc_review',
    })

    if (profileError) {
      console.error('Profile insert error:', JSON.stringify(profileError))
      await adminClient.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create profile. Please try again.' }, { status: 500 })
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

    // 4. Insert the OEP registry row, linked to the account
    const { error: registryError } = await adminClient
      .from('oep_registry')
      .insert({
        profile_id: userId,
        company_name: companyName,
        license_number: licenseNumber,
        contact_person: contactPerson,
        email,
        phone,
        head_office_location: headOfficeLocation,
        years_in_operation: yearsInOperation || 0,
        sectors_specialization: sectorsSpecialization || [],
        destination_countries: destinationCountries || [],
        monthly_placement_capacity: monthlyPlacementCapacity || null,
        company_website: companyWebsite || null,
        notes: notes || null,
      })

    if (registryError) {
      console.error('OEP registry insert error:', registryError)
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }

    // 5. Default notification preferences
    await adminClient.from('notification_preferences').insert({ user_id: userId })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/public/oep/register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
