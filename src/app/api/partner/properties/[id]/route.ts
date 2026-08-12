import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

function createAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userClient = createAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'real_estate_partner' && profile.role !== 'super_admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = supabase
      .from('property_listings')
      .select('*, profiles!property_listings_partner_id_fkey(full_name, email)')
      .eq('id', id)

    // Non-admin can only see their own
    if (profile.role === 'real_estate_partner') {
      query = query.eq('partner_id', user.id)
    }

    const { data: property, error } = await query.single()

    if (error || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ data: property })
  } catch (err) {
    console.error('GET /api/partner/properties/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userClient = createAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get current property
    const { data: existing } = await supabase
      .from('property_listings')
      .select('partner_id, status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (existing.partner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Can only edit pending properties' }, { status: 400 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.title !== undefined) updates.title = body.title
    if (body.propertyType !== undefined) updates.property_type = body.propertyType
    if (body.listingType !== undefined) updates.listing_type = body.listingType
    if (body.price !== undefined) updates.price = body.price
    if (body.currency !== undefined) updates.currency = body.currency
    if (body.location !== undefined) updates.location = body.location
    if (body.city !== undefined) updates.city = body.city
    if (body.areaSqft !== undefined) updates.area_sqft = body.areaSqft
    if (body.bedrooms !== undefined) updates.bedrooms = body.bedrooms
    if (body.bathrooms !== undefined) updates.bathrooms = body.bathrooms
    if (body.description !== undefined) updates.description = body.description
    if (body.features !== undefined) {
      updates.features = typeof body.features === 'string'
        ? body.features.split(',').map((f: string) => f.trim()).filter(Boolean)
        : body.features
    }

    const { data: property, error } = await supabase
      .from('property_listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: property })
  } catch (err) {
    console.error('PATCH /api/partner/properties/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userClient = createAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('property_listings')
      .select('partner_id, status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (existing.partner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Can only delete pending properties' }, { status: 400 })
    }

    const { error } = await supabase
      .from('property_listings')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/partner/properties/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
