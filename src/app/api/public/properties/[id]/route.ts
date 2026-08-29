import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'


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
      .select('id, title, property_type, listing_type, price, currency, location, city, country, area_sqft, bedrooms, bathrooms, description, features, images, yield_percentage, partner_id, created_at')
      .eq('id', id)
      .eq('status', 'approved')
      .single()

    if (error || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ data: property })
  } catch (err) {
    console.error('GET /api/public/properties/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
