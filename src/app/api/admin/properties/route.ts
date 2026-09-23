import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { rentalTermsForInsert } from '@/lib/rentalTerms'
import { marketColumnsFromBody } from '@/lib/marketFields'
import { plotColumnsFromBody, savePaymentPlan } from '@/lib/developments'
import { assetClassFor, isPlotListing, validatePlotListing } from '@/lib/plots'
import { CURRENCIES } from '@/lib/currencies'


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
      videoUrl,
      videoPosterUrl,
      yieldPercentage,
    } = body

    // One "Property type" control in the UI sends a subtype; the asset class
    // property_type has always driven is derived from it when not given
    // explicitly, so existing callers keep working unchanged.
    const subtype = body.propertySubtype as string | undefined
    const resolvedType = propertyType || assetClassFor(subtype)

    if (!title || !resolvedType || !listingType || !location || !city) {
      return NextResponse.json(
        { error: 'Missing required fields: title, propertyType (or propertySubtype), listingType, location, city' },
        { status: 400 }
      )
    }

    // Plots are validated on plot rules — size and category, never bedrooms.
    if (isPlotListing({ property_subtype: subtype, property_type: resolvedType })) {
      const problems = validatePlotListing({
        title, country, city,
        plotSize: body.plotSize,
        plotSizeUnit: body.plotSizeUnit,
        plotCategory: body.plotCategory,
        price,
        currency: currency || 'PKR',
        images,
        hasPaymentPlan: !!body.paymentPlan,
        inheritsDevelopmentImage: !!body.developmentId,
        supportedCurrencies: CURRENCIES,
      })
      if (problems.length) {
        return NextResponse.json({ error: problems.join(' ') }, { status: 400 })
      }
    }

    const market = marketColumnsFromBody(body, 'insert')
    if (market.problems.length) {
      return NextResponse.json({ error: market.problems.join(' ') }, { status: 400 })
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
        property_type: resolvedType,
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
        video_url: videoUrl || null,
        video_poster_url: videoPosterUrl || null,
        yield_percentage: yieldPercentage || null,
        ...plotColumnsFromBody(body),
        ...rentalTermsForInsert(listingType, body),
        ...market.columns,
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError || !property) {
      return NextResponse.json({ error: insertError?.message || 'Failed to create property' }, { status: 500 })
    }

    // A plot sold on instalments carries its own schedule. Any mismatch with
    // the advertised price comes back as a warning — never a silent fix.
    let warning: string | null = null
    if (body.paymentPlan) {
      const saved = await savePaymentPlan(supabase, { propertyId: property.id }, body.paymentPlan)
      if (saved.errors.length) {
        return NextResponse.json({ error: saved.errors.join(' '), data: property }, { status: 400 })
      }
      warning = saved.warning
    }

    return NextResponse.json({ data: property, warning }, { status: 201 })
  } catch (err) {
    logError("api.admin.properties", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
