import { NextRequest, NextResponse } from 'next/server'
import { requirePartner, hasWorkforceSectorAccess } from '@/lib/partnerAuth'


export async function GET(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error

    const { data, error } = await auth.supabase!
      .from('employer_registry')
      .select('*')
      .eq('partner_id', auth.partner!.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/partner/employers error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { supabase, partner } = auth

    if (!(await hasWorkforceSectorAccess(supabase!, partner!.id))) {
      return NextResponse.json({ error: 'You are not authorised to submit employers' }, { status: 403 })
    }

    const body = await request.json()
    const {
      companyName, contactPerson, email, phone, country, industry,
      rolesNeeded, workersNeeded, hiringTimeline, preferredNationalities, notes,
    } = body

    if (!companyName || !contactPerson || !email || !phone || !country || !industry || !rolesNeeded) {
      return NextResponse.json(
        { error: 'companyName, contactPerson, email, phone, country, industry, and rolesNeeded are required' },
        { status: 400 }
      )
    }

    const { data: employer, error } = await supabase!
      .from('employer_registry')
      .insert({
        partner_id: partner!.id,
        company_name: companyName,
        contact_person: contactPerson,
        email,
        phone,
        country,
        industry,
        roles_needed: rolesNeeded,
        workers_needed: workersNeeded || 1,
        hiring_timeline: hiringTimeline || 'immediate',
        preferred_nationalities: Array.isArray(preferredNationalities) ? preferredNationalities : [],
        notes: notes || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: employer })
  } catch (err) {
    console.error('POST /api/partner/employers error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
