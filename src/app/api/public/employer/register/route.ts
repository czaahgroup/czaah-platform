import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'edge';

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
      phone,
      country,
      industry,
      rolesNeeded,
      workersNeeded,
      hiringTimeline,
      preferredNationalities,
      notes,
    } = body

    // Validate required fields
    if (!companyName || !contactPerson || !email || !phone || !country || !industry || !rolesNeeded) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName, contactPerson, email, phone, country, industry, rolesNeeded' },
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
      .from('employer_registry')
      .insert({
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
      .select('id')
      .single()

    if (error) {
      console.error('Employer registration error:', error)
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }

    const refCode = `ER-${data.id.substring(0, 6).toUpperCase()}`

    return NextResponse.json({
      success: true,
      message: `Registration submitted successfully. Reference: ${refCode}`,
      reference: refCode,
    })
  } catch (err) {
    console.error('POST /api/public/employer/register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
