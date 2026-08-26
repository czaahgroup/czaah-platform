import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public autocomplete source — distinct cities and specific areas/locations
// across all approved listings, so the search box can suggest real places
// rather than a hardcoded list.
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('property_listings')
      .select('city, location, country')
      .eq('status', 'approved')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const cityMap = new Map<string, { label: string; country: string | null; count: number }>()
    const areaMap = new Map<string, { label: string; city: string; count: number }>()

    for (const row of data || []) {
      if (row.city) {
        const key = row.city.toLowerCase()
        const existing = cityMap.get(key)
        if (existing) existing.count += 1
        else cityMap.set(key, { label: row.city, country: row.country, count: 1 })
      }
      if (row.location && row.location.toLowerCase() !== (row.city || '').toLowerCase()) {
        const key = row.location.toLowerCase()
        const existing = areaMap.get(key)
        if (existing) existing.count += 1
        else areaMap.set(key, { label: row.location, city: row.city, count: 1 })
      }
    }

    const cities = Array.from(cityMap.values()).sort((a, b) => b.count - a.count)
    const areas = Array.from(areaMap.values()).sort((a, b) => b.count - a.count)

    return NextResponse.json({ cities, areas })
  } catch (err) {
    console.error('GET /api/public/properties/locations error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
