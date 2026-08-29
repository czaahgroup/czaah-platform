import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'


export async function POST(request: Request) {
  // Rate limit: 5 per hour per IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`register:${ip}`, 5, 3600000)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const body = await request.json()
  const {
    email, password, fullName, phone,
    companyName, companyRegistrationNumber, country,
    industryInterests, companyWebsite, companyDescription,
    documents, // array of { docType, fileName, fileData (base64) }
    partnerCode, // optional: a Partner ID or referral code entered at signup
  } = body

  // Check file sizes (10MB max per document)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (documents && Array.isArray(documents)) {
    for (const doc of documents) {
      if (doc.fileData && Buffer.from(doc.fileData, 'base64').length > maxSize) {
        return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 })
      }
    }
  }

  const supabase = createAdminClient()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm so they can log in
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user.id

  // 2. Insert profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    full_name: fullName,
    email,
    phone,
    company_name: companyName,
    company_registration_number: companyRegistrationNumber,
    country,
    industry_interests: industryInterests,
    company_website: companyWebsite || null,
    company_description: companyDescription || null,
    role: 'member',
    status: 'pending_kyc_review',
  })

  if (profileError) {
    console.error('Profile insert error:', JSON.stringify(profileError))
    // Clean up: delete the auth user if profile insert fails
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Failed to create profile. Please try again.' }, { status: 500 })
  }

  // 3. Upload documents and create records
  for (const doc of documents || []) {
    const { docType, fileName, fileData } = doc
    const filePath = `${userId}/${docType}`

    // Decode base64 to buffer
    const buffer = Buffer.from(fileData, 'base64')

    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, buffer, {
        upsert: true,
        contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed for ${docType}: ${uploadError.message}` }, { status: 500 })
    }

    const { error: docError } = await supabase.from('kyc_documents').insert({
      user_id: userId,
      document_type: docType,
      file_url: filePath,
      review_status: 'pending',
    })

    if (docError) {
      return NextResponse.json({ error: `Document record failed: ${docError.message}` }, { status: 500 })
    }
  }

  // 4. Insert notification preferences (defaults)
  await supabase.from('notification_preferences').insert({
    user_id: userId,
  })

  // 5. If a Partner ID / referral code was entered, connect this profile to
  // that partner privately. Never blocks registration — an invalid or
  // mistyped code is silently ignored.
  const trimmedCode = typeof partnerCode === 'string' ? partnerCode.trim() : ''
  if (trimmedCode) {
    try {
      const { data: partner } = await supabase
        .from('partners')
        .select('id, partner_id, referral_code')
        .eq('status', 'active')
        .or(`partner_id.eq.${trimmedCode},referral_code.eq.${trimmedCode}`)
        .maybeSingle()

      if (partner) {
        await supabase.from('partner_referrals').insert({
          partner_id: partner.id,
          referred_profile_id: userId,
          connected_via: partner.partner_id === trimmedCode ? 'partner_id' : 'referral_code',
        })
      }
    } catch (referralErr) {
      console.error('Partner referral link failed (non-blocking):', referralErr)
    }
  }

  return NextResponse.json({ success: true, userId })
}
