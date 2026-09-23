import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { LISTING_COLUMNS } from '@/lib/developments'
import { allowedCountries } from '@/lib/propertyLocations'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const city = searchParams.get('city')
    const type = searchParams.get('type')
    const subtype = searchParams.get('subtype')
    const listingType = searchParams.get('listing_type')
    const minPrice = searchParams.get('min_price')
    const maxPrice = searchParams.get('max_price')
    const search = searchParams.get('search')
    const countries = searchParams.get('countries') // comma-separated, e.g. "Pakistan,United Kingdom"
    const country = searchParams.get('country')
    // Plot filters. Size bands are NOT filtered here — marla, kanal and ft²
    // are mixed across markets, so the portal compares them in ft² client-side
    // the same way it compares prices in USD.
    const plotCategory = searchParams.get('plot_category')
    const possession = searchParams.get('possession_status')
    const development = searchParams.get('development_id')

    let query = supabase
      .from('property_listings')
      .select(LISTING_COLUMNS)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (city) query = query.ilike('city', `%${city}%`)
    if (type) query = query.eq('property_type', type)
    if (subtype) query = query.eq('property_subtype', subtype)
    if (listingType) query = query.eq('listing_type', listingType)
    if (minPrice) query = query.gte('price', Number(minPrice))
    if (maxPrice) query = query.lte('price', Number(maxPrice))
    if (search) {
      // The term is interpolated into a PostgREST filter expression, where
      // , ( ) : and * are syntax — strip them so a search can only ever be a
      // search, and cap the length.
      const term = search.replace(/[,()*:\\%]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
      if (term) query = query.or(`title.ilike.%${term}%,location.ilike.%${term}%,description.ilike.%${term}%,city.ilike.%${term}%,country.ilike.%${term}%,development_name.ilike.%${term}%`)
    }
    // Only markets switched on in admin → Locations are ever returned, however
    // the caller asks. Hidden markets used to be hidden by the browser alone.
    const requested = [countries, country].filter(Boolean).join(',').split(',').map((c) => c.trim()).filter(Boolean)
    const markets = await allowedCountries(requested.length ? requested : null)
    if (markets) query = query.in('country', markets.length ? markets : ['__none__'])
    if (plotCategory) query = query.eq('plot_category', plotCategory)
    if (possession) query = query.eq('possession_status', possession)
    if (development) query = query.eq('development_id', development)
    // Boolean plot flags only ever narrow: ?corner_plot=true means "corner
    // plots only", never "non-corner plots only".
    for (const flag of ['corner_plot', 'park_facing', 'main_road', 'boulevard', 'canal_facing', 'approved', 'verified', 'featured']) {
      if (searchParams.get(flag) === 'true') query = query.eq(flag, true)
    }

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
