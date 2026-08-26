import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 30 per minute per user
    const { success: rateLimitOk } = rateLimit(`search:${user.id}`, 30, 60000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) {
      return NextResponse.json({
        members: [],
        enquiries: [],
        investments: [],
        sectors: [],
        services: [],
      })
    }

    const adminClient = createAdminClient()

    // Get user's role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'member'
    const isAdmin = role === 'super_admin' || role === 'admin'
    const searchPattern = `%${q}%`

    // Run searches in parallel
    const searches = []

    // Members search (admin/super_admin only)
    if (isAdmin) {
      searches.push(
        adminClient
          .from('profiles')
          .select('id, full_name, email, company_name, role')
          .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern},company_name.ilike.${searchPattern}`)
          .limit(8)
          .then(({ data }) => ({
            key: 'members',
            results: (data || []).map((p) => ({
              id: p.id,
              title: p.full_name || p.email,
              subtitle: [p.company_name, p.role?.replace(/_/g, ' ')].filter(Boolean).join(' - '),
              type: 'member',
              link: '/admin/users',
            })),
          }))
      )
    } else {
      searches.push(Promise.resolve({ key: 'members', results: [] }))
    }

    // Enquiries search
    if (isAdmin) {
      searches.push(
        adminClient
          .from('enquiries')
          .select('id, reference_number, product_name, description, status')
          .or(`reference_number.ilike.${searchPattern},product_name.ilike.${searchPattern},description.ilike.${searchPattern}`)
          .limit(8)
          .then(({ data }) => ({
            key: 'enquiries',
            results: (data || []).map((e) => ({
              id: e.id,
              title: e.reference_number,
              subtitle: [e.product_name, e.status].filter(Boolean).join(' - '),
              type: 'enquiry',
              link: `/admin/enquiries`,
            })),
          }))
      )
    } else {
      // Members only see their own enquiries
      searches.push(
        adminClient
          .from('enquiries')
          .select('id, reference_number, product_name, description, status')
          .eq('member_id', user.id)
          .or(`reference_number.ilike.${searchPattern},product_name.ilike.${searchPattern},description.ilike.${searchPattern}`)
          .limit(8)
          .then(({ data }) => ({
            key: 'enquiries',
            results: (data || []).map((e) => ({
              id: e.id,
              title: e.reference_number,
              subtitle: [e.product_name, e.status].filter(Boolean).join(' - '),
              type: 'enquiry',
              link: `/dashboard/enquiries/${e.id}`,
            })),
          }))
      )
    }

    // Investments search
    searches.push(
      adminClient
        .from('investment_opportunities')
        .select('id, title, description, sector_tag, status')
        .or(`title.ilike.${searchPattern},description.ilike.${searchPattern},sector_tag.ilike.${searchPattern}`)
        .limit(8)
        .then(({ data }) => ({
          key: 'investments',
          results: (data || []).map((inv) => ({
            id: inv.id,
            title: inv.title,
            subtitle: [inv.sector_tag, inv.status?.replace(/_/g, ' ')].filter(Boolean).join(' - '),
            type: 'investment',
            link: isAdmin ? '/admin/content/investments' : `/investments/${inv.id}`,
          })),
        }))
    )

    // Sectors search
    searches.push(
      adminClient
        .from('sectors')
        .select('id, name, slug')
        .ilike('name', searchPattern)
        .limit(8)
        .then(({ data }) => ({
          key: 'sectors',
          results: (data || []).map((s) => ({
            id: s.id,
            title: s.name,
            subtitle: 'Sector',
            type: 'sector',
            link: `/sectors/${s.slug || s.id}`,
          })),
        }))
    )

    // Services search
    searches.push(
      adminClient
        .from('services')
        .select('id, name, slug')
        .ilike('name', searchPattern)
        .limit(8)
        .then(({ data }) => ({
          key: 'services',
          results: (data || []).map((s) => ({
            id: s.id,
            title: s.name,
            subtitle: 'Service',
            type: 'service',
            link: `/services/${s.slug || s.id}`,
          })),
        }))
    )

    const results = await Promise.all(searches)
    const response: Record<string, unknown[]> = {}
    for (const r of results) {
      response[r.key] = r.results
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Search API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
