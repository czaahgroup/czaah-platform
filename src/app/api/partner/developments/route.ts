import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logError'
import { rateLimit } from '@/lib/rateLimit'
import { requireLister, checkedPhotos, notifyAdmins } from '@/lib/partnerListingAuth'
import { uniqueSlug } from '@/lib/developments'
import { slugify } from '@/lib/plots'
import { cleanDevelopment } from '@/lib/partnerDevelopments'
import { proposeDeveloper, replaceUnits } from '@/lib/partnerDevelopmentStore'

/**
 * A partner's own developments (new projects).
 *
 * A project is one development row plus a unit per plot size / home type,
 * each with an optional payment plan. Whatever a partner submits is stored as
 * a draft: only an admin publishes it (Admin → Developments).
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLister(request)
    if (auth.error) return auth.error

    const { data, error } = await auth.supabase
      .from('developments')
      .select('id, name, slug, developer_name, country, city, area, currency, status, featured_image, created_at, development_units(id, total_price)')
      .eq('created_by', auth.userId)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      data: (data || []).map(({ development_units, ...d }) => {
        const prices = (development_units || []).map((u) => Number(u.total_price)).filter((p) => p > 0)
        return { ...d, unit_count: (development_units || []).length, from_price: prices.length ? Math.min(...prices) : null }
      }),
    })
  } catch (err) {
    logError('api.partner.developments', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireLister(request)
    if (auth.error) return auth.error
    const { supabase, userId } = auth

    if (!rateLimit(`development-create:${userId}`, 10, 3600000).success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const cleaned = cleanDevelopment(body)
    if (cleaned.problems.length) return NextResponse.json({ error: cleaned.problems.join(' ') }, { status: 400 })
    const { development, units, newDeveloper } = cleaned

    const photos = await checkedPhotos(supabase, userId, body.photos, [])
    const logo = (await checkedPhotos(supabase, userId, body.newDeveloper?.logo ? [body.newDeveloper.logo] : [], []))[0] || null

    if (newDeveloper) {
      const proposed = await proposeDeveloper(supabase, userId, { ...newDeveloper, logo_url: logo })
      if (proposed.error) return NextResponse.json({ error: proposed.error }, { status: 400 })
      development!.developer_name = proposed.name
    }

    const { data: row, error } = await supabase
      .from('developments')
      .insert({
        ...development,
        slug: await uniqueSlug(supabase, slugify(development!.name)),
        featured_image: photos[0] || null,
        gallery: photos,
        // A partner can never publish, feature or verify their own project.
        status: 'draft',
        featured: false,
        agent_id: userId,
        created_by: userId,
      })
      .select('id, name, slug, status, currency')
      .single()
    if (error || !row) return NextResponse.json({ error: error?.message || 'Could not save the project.' }, { status: 500 })

    const saved = await replaceUnits(supabase, row.id, units!, row.currency)
    if (saved.error) {
      // Nothing half-made is left behind for the partner to stumble on.
      await supabase.from('developments').delete().eq('id', row.id)
      return NextResponse.json({ error: saved.error }, { status: 400 })
    }

    await notifyAdmins(supabase, 'New development to review', `"${row.name}" was submitted by a partner and is waiting to be published.`, '/admin/developments')
    return NextResponse.json({ data: row, warnings: saved.warnings }, { status: 201 })
  } catch (err) {
    logError('api.partner.developments', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
