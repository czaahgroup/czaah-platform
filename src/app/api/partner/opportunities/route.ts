import { NextRequest, NextResponse } from 'next/server'
import { requirePartner } from '@/lib/partnerAuth'


const VALID_TYPES = [
  'buyer_required', 'seller_supplier_available', 'investor_required',
  'investment_available', 'project_available', 'joint_venture',
  'property_opportunity', 'recruitment_requirement', 'other',
]
const VALID_CONFIDENTIALITY = ['standard', 'confidential', 'highly_confidential']

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error

    const { data, error } = await auth.supabase!
      .from('partner_opportunities')
      .select('*, sectors(id, name), partner_opportunity_documents(id, file_name)')
      .eq('partner_id', auth.partner!.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/partner/opportunities error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { supabase, partner } = auth

    const body = await request.json()
    const {
      title, sectorId, country, opportunityType, summary, description,
      estimatedValue, contactOrCompany, partnerRole, confidentialityLevel,
      workersNeeded, tradeSkill,
      submit,
    } = body

    if (!title || !summary || !opportunityType) {
      return NextResponse.json({ error: 'title, summary, and opportunityType are required' }, { status: 400 })
    }
    if (!VALID_TYPES.includes(opportunityType)) {
      return NextResponse.json({ error: 'Invalid opportunityType' }, { status: 400 })
    }
    if (confidentialityLevel && !VALID_CONFIDENTIALITY.includes(confidentialityLevel)) {
      return NextResponse.json({ error: 'Invalid confidentialityLevel' }, { status: 400 })
    }

    // Only allow submitting into sectors this partner is authorised for
    if (sectorId) {
      const { data: access } = await supabase!
        .from('partner_sector_access')
        .select('id')
        .eq('partner_id', partner!.id)
        .eq('sector_id', sectorId)
        .maybeSingle()
      if (!access) {
        return NextResponse.json({ error: 'You are not authorised for this sector' }, { status: 403 })
      }
    }

    const { data: opportunity, error } = await supabase!
      .from('partner_opportunities')
      .insert({
        partner_id: partner!.id,
        title,
        sector_id: sectorId || null,
        country: country || null,
        opportunity_type: opportunityType,
        summary,
        description: description || null,
        estimated_value: estimatedValue || null,
        contact_or_company: contactOrCompany || null,
        partner_role: partnerRole || null,
        confidentiality_level: confidentialityLevel || 'standard',
        workers_needed: opportunityType === 'recruitment_requirement' && workersNeeded ? Number(workersNeeded) : null,
        trade_skill: opportunityType === 'recruitment_requirement' ? (tradeSkill || null) : null,
        status: submit ? 'submitted' : 'draft',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: opportunity })
  } catch (err) {
    console.error('POST /api/partner/opportunities error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
