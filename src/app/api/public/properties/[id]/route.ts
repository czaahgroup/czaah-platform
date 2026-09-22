import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { LISTING_COLUMNS, loadPlanForListing } from '@/lib/developments'

// Public single-listing endpoint — powers the property.czaah.com detail page.
// Only ever returns an approved listing.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: property, error } = await supabase
      .from('property_listings')
      .select(`${LISTING_COLUMNS}, partner_id`)
      .eq('id', id)
      .eq('status', 'approved')
      .single()

    if (error || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // A plot sold on instalments carries its own plan; a flat normally doesn't.
    const paymentPlan = await loadPlanForListing(supabase, id)

    // When the listing belongs to a development, hand back enough of it to
    // link through without a second round trip.
    let development = null
    if (property.development_id) {
      const { data } = await supabase
        .from('developments')
        .select('id, name, slug, developer_name, marketing_agent, status')
        .eq('id', property.development_id)
        .eq('status', 'published')
        .maybeSingle()
      development = data
    }

    return NextResponse.json({ data: { ...property, payment_plan: paymentPlan, development } })
  } catch (err) {
    logError("api.public.properties.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
