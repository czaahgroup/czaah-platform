import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { DEVELOPMENT_COLUMNS, UNIT_COLUMNS } from '@/lib/developments'
import { allowedCountries } from '@/lib/propertyLocations'

// Published developments for the portal. Only ever returns status=published —
// a draft scheme must never leak a price to the public site.
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const country = searchParams.get('country')
    const countries = searchParams.get('countries')
    const city = searchParams.get('city')
    const featured = searchParams.get('featured')

    let query = supabase
      .from('developments')
      .select(`${DEVELOPMENT_COLUMNS}, development_units(${UNIT_COLUMNS})`)
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })

    // Active markets only, whatever the caller asks for (see properties route).
    const requested = [countries, country].filter(Boolean).join(',').split(',').map((c) => c.trim()).filter(Boolean)
    const markets = await allowedCountries(requested.length ? requested : null)
    if (markets) query = query.in('country', markets.length ? markets : ['__none__'])
    if (city) query = query.ilike('city', `%${city}%`)
    if (featured === 'true') query = query.eq('featured', true)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err) {
    logError('api.public.developments', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
