import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'


export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 per hour per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { success } = rateLimit(`employer-register:${ip}`, 5, 60 * 60 * 1000)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      companyName,
      contactPerson,
      email,
      password,
      phone,
      country,
      industry,
      rolesNeeded,
      workersNeeded,
      hiringTimeline,
      preferredNationalities,
      notes,
      identityDocument,
    } = body

    // Validate required fields
    if (!companyName || !contactPerson || !email || !password || !phone || !country || !industry || !rolesNeeded) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName, contactPerson, email, password, phone, country, industry, rolesNeeded' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (!identityDocument || typeof identityDocument !== 'string') {
      return NextResponse.json(
        { error: 'An identity document (company registration certificate, personal ID, passport, or other government-approved proof of identity/residence) is required to register.' },
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
      country,
      role: 'employer',
      status: 'pending_kyc_review',
    })

    if (profileError) {
      logError('api.public.employer.register', profileError, { step: 'profile-insert' })
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
      logError('api.public.employer.register', docUploadError, { step: 'upload-identity-document' })
      return NextResponse.json({ error: 'Failed to upload identity document. Please try again.' }, { status: 500 })
    }

    const { error: kycDocError } = await adminClient.from('kyc_documents').insert({
      user_id: userId,
      document_type: 'identity_document',
      file_url: docPath,
      review_status: 'pending',
    })

    if (kycDocError) {
      logError('api.public.employer.register', kycDocError, { step: 'kyc-document-record' })
      return NextResponse.json({ error: 'Failed to record identity document. Please try again.' }, { status: 500 })
    }

    // 4. Insert the employer registry row, linked to the account
    const { error: registryError } = await adminClient
      .from('employer_registry')
      .insert({
        profile_id: userId,
        company_name: companyName,
        contact_person: contactPerson,
        email,
        phone,
        country,
        industry,
        roles_needed: rolesNeeded,
        workers_needed: workersNeeded || 1,
        hiring_timeline: hiringTimeline || 'immediate',
        preferred_nationalities: preferredNationalities || [],
        notes: notes || null,
      })

    if (registryError) {
      logError('api.public.employer.register', registryError, { step: 'employer-registry-insert' })
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }

    // 5. Default notification preferences
    await adminClient.from('notification_preferences').insert({ user_id: userId })

    return NextResponse.json({ success: true })
  } catch (err) {
    logError("api.public.employer.register", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
