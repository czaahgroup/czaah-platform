import { NextRequest, NextResponse } from 'next/server'
import { requirePartner } from '@/lib/partnerAuth'


const VALID_CONFIDENTIALITY = ['standard', 'confidential', 'highly_confidential']

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { id } = await params

    const { data, error } = await auth.supabase!
      .from('partner_opportunities')
      .select('*, sectors(id, name), partner_opportunity_documents(id, file_name, file_path)')
      .eq('id', id)
      .eq('partner_id', auth.partner!.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/partner/opportunities/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { supabase, partner } = auth
    const { id } = await params

    const { data: existing } = await supabase!
      .from('partner_opportunities')
      .select('id, status, partner_id')
      .eq('id', id)
      .eq('partner_id', partner!.id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    if (!['draft', 'more_info_required'].includes(existing.status)) {
      return NextResponse.json({ error: 'This opportunity can no longer be edited' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title, sectorId, country, opportunityType, summary, description,
      estimatedValue, contactOrCompany, partnerRole, confidentialityLevel,
      workersNeeded, tradeSkill,
      submit,
    } = body

    if (confidentialityLevel && !VALID_CONFIDENTIALITY.includes(confidentialityLevel)) {
      return NextResponse.json({ error: 'Invalid confidentialityLevel' }, { status: 400 })
    }

    // Editable, partner-owned fields only — status/visibility_scope/admin_notes/
    // commission_notes are deliberately never accepted here, even if sent.
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (sectorId !== undefined) updates.sector_id = sectorId
    if (country !== undefined) updates.country = country
    if (opportunityType !== undefined) updates.opportunity_type = opportunityType
    if (summary !== undefined) updates.summary = summary
    if (description !== undefined) updates.description = description
    if (estimatedValue !== undefined) updates.estimated_value = estimatedValue
    if (contactOrCompany !== undefined) updates.contact_or_company = contactOrCompany
    if (partnerRole !== undefined) updates.partner_role = partnerRole
    if (confidentialityLevel !== undefined) updates.confidentiality_level = confidentialityLevel
    if (workersNeeded !== undefined) updates.workers_needed = workersNeeded ? Number(workersNeeded) : null
    if (tradeSkill !== undefined) updates.trade_skill = tradeSkill || null
    if (submit) updates.status = 'submitted'

    const { error } = await supabase!.from('partner_opportunities').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/partner/opportunities/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
