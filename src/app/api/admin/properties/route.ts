import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


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

export async function GET(request: NextRequest) {
  try {
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

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('property_listings')
      .select('*, profiles!property_listings_partner_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: properties, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: properties })
  } catch (err) {
    logError("api.admin.properties", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      propertyType,
      listingType,
      price,
      currency,
      location,
      city,
      country,
      areaSqft,
      bedrooms,
      bathrooms,
      description,
      features,
      images,
      yieldPercentage,
    } = body

    if (!title || !propertyType || !listingType || !location || !city) {
      return NextResponse.json(
        { error: 'Missing required fields: title, propertyType, listingType, location, city' },
        { status: 400 }
      )
    }

    const featuresArray = features
      ? (typeof features === 'string' ? features.split(',').map((f: string) => f.trim()).filter(Boolean) : features)
      : []

    const imagesArray = images
      ? (typeof images === 'string' ? images.split(',').map((i: string) => i.trim()).filter(Boolean) : images)
      : []

    const { data: property, error: insertError } = await supabase
      .from('property_listings')
      .insert({
        partner_id: null, // CZAAH-direct listing, not partner-submitted
        title,
        property_type: propertyType,
        listing_type: listingType,
        price: price || null,
        currency: currency || 'USD',
        location,
        city,
        country: country || null,
        area_sqft: areaSqft || null,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        description: description || null,
        features: featuresArray,
        images: imagesArray,
        yield_percentage: yieldPercentage || null,
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError || !property) {
      return NextResponse.json({ error: insertError?.message || 'Failed to create property' }, { status: 500 })
    }

    return NextResponse.json({ data: property }, { status: 201 })
  } catch (err) {
    logError("api.admin.properties", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
