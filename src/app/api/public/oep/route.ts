import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')

    let query = adminClient
      .from('oep_registry')
      .select('id, company_name, head_office_location, years_in_operation, sectors_specialization, destination_countries, company_website')
      .eq('status', 'verified')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`company_name.ilike.%${search}%,head_office_location.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Public OEP fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('GET /api/public/oep error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
