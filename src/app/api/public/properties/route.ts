import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const city = searchParams.get('city')
    const type = searchParams.get('type')
    const listingType = searchParams.get('listing_type')
    const minPrice = searchParams.get('min_price')
    const maxPrice = searchParams.get('max_price')
    const search = searchParams.get('search')
    const countries = searchParams.get('countries') // comma-separated, e.g. "Pakistan,United Kingdom"

    let query = supabase
      .from('property_listings')
      .select('id, title, property_type, listing_type, price, currency, location, city, country, area_sqft, bedrooms, bathrooms, description, features, images, yield_percentage, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (city) query = query.ilike('city', `%${city}%`)
    if (type) query = query.eq('property_type', type)
    if (listingType) query = query.eq('listing_type', listingType)
    if (minPrice) query = query.gte('price', Number(minPrice))
    if (maxPrice) query = query.lte('price', Number(maxPrice))
    if (search) query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`)
    if (countries) query = query.in('country', countries.split(',').map((c) => c.trim()))

    const { data: properties, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: properties })
  } catch (err) {
    logError("api.public.properties", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
