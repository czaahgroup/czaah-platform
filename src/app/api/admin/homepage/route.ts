import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { logActivity } from '@/lib/activity'
import { normaliseHomeLayout, validateHomeLayout } from '@/lib/homeLayout'

/**
 * Admin → Homepage (property.czaah.com home page).
 *   GET    { layout, listings, developments } — current layout + what can be featured
 *   PUT    { sections: [{ key, visible }] }  — order and visibility of home sections
 *   PATCH  { target: 'listing' | 'development', id, featured }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const db = auth.supabase
    const [row, listings, developments] = await Promise.all([
      db.from('portal_content').select('data, updated_at').eq('key', 'homeLayout').maybeSingle(),
      db.from('property_listings').select('id, title, city, country, listing_type, featured, images, created_at').eq('status', 'approved').order('created_at', { ascending: false }).limit(300),
      db.from('developments').select('id, name, city, country, featured, status').eq('status', 'published').order('created_at', { ascending: false }).limit(100),
    ])
    return NextResponse.json({
      layout: normaliseHomeLayout(row.data?.data),
      updated_at: row.data?.updated_at ?? null,
      listings: listings.data || [],
      developments: developments.data || [],
    })
  } catch (err) {
    logError('api.admin.homepage.get', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { sections, error } = validateHomeLayout(await request.json().catch(() => null))
    if (error) return NextResponse.json({ error }, { status: 400 })
    const { error: dbError } = await auth.supabase.from('portal_content')
      .upsert({ key: 'homeLayout', data: { sections }, updated_at: new Date().toISOString(), updated_by: auth.userId }, { onConflict: 'key' })
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    await logActivity({ actorId: auth.userId, action: 'portal.home_layout.updated', metadata: { hidden: sections!.filter((s) => !s.visible).map((s) => s.key) } })
    return NextResponse.json({ success: true, layout: sections })
  } catch (err) {
    logError('api.admin.homepage.put', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { target, id, featured } = await request.json().catch(() => ({}))
    const table = target === 'listing' ? 'property_listings' : target === 'development' ? 'developments' : null
    if (!table || typeof id !== 'string' || typeof featured !== 'boolean') return NextResponse.json({ error: 'Send { target, id, featured }.' }, { status: 400 })
    const { data, error } = await auth.supabase.from(table).update({ featured }).eq('id', id).select('id').maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await logActivity({ actorId: auth.userId, action: `${target}.${featured ? 'featured' : 'unfeatured'}`, targetId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.homepage.patch', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
