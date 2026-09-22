import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import {
  DEVELOPMENT_COLUMNS,
  UNIT_COLUMNS,
  persistImages,
  uniqueSlug,
  insertUnit,
  type UnitPayload,
} from '@/lib/developments'
import { slugify } from '@/lib/plots'

function num(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

// Admin CRUD for developments — a scheme with several plot sizes is ONE
// development row plus a unit per size, never a duplicated development.

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const country = searchParams.get('country')

    let query = supabase
      .from('developments')
      .select(`${DEVELOPMENT_COLUMNS}, development_units(${UNIT_COLUMNS})`)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (country) query = query.eq('country', country)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err) {
    logError('api.admin.developments', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase, userId } = auth

    const body = await request.json()
    const { name, country, city } = body

    if (!name || !country || !city) {
      return NextResponse.json(
        { error: 'Missing required fields: name, country, city' },
        { status: 400 }
      )
    }

    const slug = await uniqueSlug(supabase, body.slug ? slugify(body.slug) : slugify(name))

    // Images arrive as data URLs from the form; they become storage paths.
    const gallery = await persistImages(supabase, body.gallery, `developments/${slug}`)
    const featuredImageList = await persistImages(supabase, body.featuredImage ? [body.featuredImage] : [], `developments/${slug}`)

    const { data: development, error } = await supabase
      .from('developments')
      .insert({
        name,
        slug,
        developer_name: body.developerName || null,
        marketing_agent: body.marketingAgent || null,
        description: body.description || null,
        country,
        province_state: body.provinceState || null,
        city,
        area: body.area || null,
        address: body.address || null,
        latitude: num(body.latitude),
        longitude: num(body.longitude),
        approval_status: body.approvalStatus || null,
        approval_authority: body.approvalAuthority || null,
        featured_image: featuredImageList[0] || null,
        gallery,
        features: Array.isArray(body.features)
          ? body.features
          : String(body.features || '').split(',').map((f: string) => f.trim()).filter(Boolean),
        currency: body.currency || 'PKR',
        development_status: body.developmentStatus || null,
        possession_status: body.possessionStatus || null,
        status: body.status || 'draft',
        featured: !!body.featured,
        verified: !!body.verified,
        agent_id: body.agentId || null,
        created_by: userId,
      })
      .select(DEVELOPMENT_COLUMNS)
      .single()

    if (error || !development) {
      return NextResponse.json({ error: error?.message || 'Could not create development' }, { status: 500 })
    }

    // Units, each with an optional payment plan. Any plan that doesn't add up
    // is reported back rather than corrected.
    const warnings: string[] = []
    const units: UnitPayload[] = Array.isArray(body.units) ? body.units : []

    for (let i = 0; i < units.length; i++) {
      const result = await insertUnit(supabase, development.id, units[i], i, development.currency)
      if (result.error) {
        return NextResponse.json({ error: `Unit ${i + 1}: ${result.error}`, data: development }, { status: 400 })
      }
      if (result.warning) warnings.push(`${units[i].title || `Unit ${i + 1}`}: ${result.warning}`)
    }

    return NextResponse.json({ data: development, warnings }, { status: 201 })
  } catch (err) {
    logError('api.admin.developments', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
