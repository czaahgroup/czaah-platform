import { NextRequest, NextResponse } from 'next/server'
import { requirePartner, hasWorkforceSectorAccess } from '@/lib/partnerAuth'


export async function GET(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error

    const { data, error } = await auth.supabase!
      .from('oep_registry')
      .select('*')
      .eq('partner_id', auth.partner!.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/partner/oep error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { supabase, partner } = auth

    if (!(await hasWorkforceSectorAccess(supabase!, partner!.id))) {
      return NextResponse.json({ error: 'You are not authorised to submit Employment Promoters' }, { status: 403 })
    }

    const body = await request.json()
    const {
      companyName, licenseNumber, contactPerson, email, phone, headOfficeLocation,
      yearsInOperation, sectorsSpecialization, destinationCountries,
      monthlyPlacementCapacity, companyWebsite, notes,
    } = body

    if (!companyName || !licenseNumber || !contactPerson || !email || !phone || !headOfficeLocation) {
      return NextResponse.json(
        { error: 'companyName, licenseNumber, contactPerson, email, phone, and headOfficeLocation are required' },
        { status: 400 }
      )
    }

    const { data: oep, error } = await supabase!
      .from('oep_registry')
      .insert({
        partner_id: partner!.id,
        company_name: companyName,
        license_number: licenseNumber,
        contact_person: contactPerson,
        email,
        phone,
        head_office_location: headOfficeLocation,
        years_in_operation: yearsInOperation || 0,
        sectors_specialization: Array.isArray(sectorsSpecialization) ? sectorsSpecialization : [],
        destination_countries: Array.isArray(destinationCountries) ? destinationCountries : [],
        monthly_placement_capacity: monthlyPlacementCapacity || null,
        company_website: companyWebsite || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: oep })
  } catch (err) {
    console.error('POST /api/partner/oep error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
