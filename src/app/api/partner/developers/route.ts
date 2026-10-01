import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logError'
import { rateLimit } from '@/lib/rateLimit'
import { requireLister, checkedPhotos, notifyAdmins } from '@/lib/partnerListingAuth'
import { proposeDeveloper } from '@/lib/partnerDevelopmentStore'

/**
 * Developers, as a partner sees them: the ones already on the portal (to pick
 * from) and the ones they have proposed themselves. A proposed developer
 * stays off the portal until an admin approves it in Admin → Developers.
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLister(request)
    if (auth.error) return auth.error
    const [active, mine] = await Promise.all([
      auth.supabase.from('property_developers').select('id, name').eq('active', true).order('name'),
      auth.supabase.from('property_developers').select('id, name, website, active, verification_status, created_at').eq('created_by', auth.userId).order('created_at', { ascending: false }),
    ])
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 500 })
    return NextResponse.json({ data: active.data || [], mine: mine.data || [] })
  } catch (err) {
    logError('api.partner.developers', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireLister(request)
    if (auth.error) return auth.error
    const { supabase, userId } = auth
    if (!rateLimit(`developer-propose:${userId}`, 10, 3600000).success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
    const name = text(body.name, 150)
    if (!name) return NextResponse.json({ error: 'The developer needs a name.' }, { status: 400 })
    const website = text(body.website, 300)
    const logo = (await checkedPhotos(supabase, userId, body.logo ? [body.logo] : [], []))[0] || null

    const proposed = await proposeDeveloper(supabase, userId, {
      name,
      website: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null,
      description: text(body.description, 4000) || null,
      logo_url: logo,
    })
    if (proposed.error) return NextResponse.json({ error: proposed.error }, { status: 400 })
    if (!proposed.created) {
      return NextResponse.json({ data: { name: proposed.name }, message: `${proposed.name} is already in the list — you can choose it on a project.` })
    }
    await notifyAdmins(supabase, 'New developer to review', `"${name}" was proposed by a partner and is hidden until you approve it.`, '/admin/developers')
    return NextResponse.json({ data: { name: proposed.name }, message: 'Sent to CZAAH for approval.' }, { status: 201 })
  } catch (err) {
    logError('api.partner.developers', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
