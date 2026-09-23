import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { logActivity } from '@/lib/activity'
import { slugify } from '@/lib/plots'
import { loadLocationRows } from '@/lib/propertyLocations'

/**
 * Admin → Locations: the region → country → city → area hierarchy.
 *
 * Every write is followed by resync_property_locations(), so listings and
 * developments whose free-text city now matches (or no longer matches) a row
 * are relinked straight away — adding "Multan" links the Multan listings.
 */

type Kind = 'region' | 'country' | 'city' | 'area'
const TABLE: Record<Kind, string> = {
  region: 'property_regions',
  country: 'property_countries',
  city: 'property_cities',
  area: 'property_areas',
}
// Which column on listings/developments points at each kind.
const LINK: Partial<Record<Kind, string>> = { country: 'country_id', city: 'city_id', area: 'area_id' }

const text = (v: unknown, max: number) => {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s.slice(0, max) : null
}
const int = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Whitelists and normalises the fields a caller may set for one kind. */
function clean(kind: Kind, body: Record<string, unknown>, creating: boolean): { data?: Record<string, unknown>; error?: string } {
  const d: Record<string, unknown> = {}
  const has = (k: string) => k in body

  if (creating || has('name')) {
    const name = text(body.name, 120)
    if (!name && kind !== 'country') return { error: 'A name is required.' }
    if (name) d.name = name
  }
  if (has('slug') || (creating && d.name)) {
    const slug = slugify(String(body.slug || d.name || ''))
    if (!slug) return { error: 'A URL slug is required.' }
    d.slug = slug
  }
  if (has('active')) d.active = body.active === true
  if (has('display_order')) d.display_order = int(body.display_order)

  if (kind === 'region') {
    if (has('description')) d.description = text(body.description, 800)
  }
  if (kind === 'country') {
    if (creating) {
      if (!UUID.test(String(body.region_id))) return { error: 'Choose a region.' }
      const code = String(body.country_code || '').trim().toUpperCase()
      if (!/^[A-Z]{2}$/.test(code)) return { error: 'Choose a country.' }
      d.region_id = body.region_id
      d.country_code = code
    } else if (has('region_id')) {
      if (!UUID.test(String(body.region_id))) return { error: 'Choose a region.' }
      d.region_id = body.region_id
    }
    if (has('currency')) {
      const ccy = String(body.currency || '').trim().toUpperCase()
      if (!/^[A-Z]{3}$/.test(ccy)) return { error: 'Currency must be a 3-letter code, e.g. GBP.' }
      d.currency = ccy
    }
    if (has('tagline')) d.tagline = text(body.tagline, 200)
    if (has('description')) d.description = text(body.description, 1500)
    if (has('image_url')) d.image_url = text(body.image_url, 1000)
  }
  if (kind === 'city') {
    if (creating) {
      if (!UUID.test(String(body.country_id))) return { error: 'Choose a country.' }
      d.country_id = body.country_id
    }
    if (has('tagline')) d.tagline = text(body.tagline, 200)
    if (has('blurb')) d.blurb = text(body.blurb, 1500)
    if (has('image_url')) d.image_url = text(body.image_url, 1000)
  }
  if (kind === 'area') {
    if (creating) {
      if (!UUID.test(String(body.city_id))) return { error: 'Choose a city.' }
      d.city_id = body.city_id
    }
    if (has('postcode_prefix')) d.postcode_prefix = text(body.postcode_prefix, 12)
  }
  return { data: d }
}

function friendly(err: { code?: string; message?: string }) {
  if (err.code === '23505') return 'That name or URL slug is already in use.'
  if (err.code === '23503') return 'It still has locations under it (or is not a valid country). Remove or move those first — or switch it off instead.'
  if (err.code === '23514') return 'The URL slug may only contain lower-case letters, numbers and hyphens.'
  return err.message || 'Save failed.'
}

async function resync(supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase']) {
  const { data, error } = await supabase!.rpc('resync_property_locations')
  if (error) logError('api.admin.locations', error, { step: 'resync' })
  const row = Array.isArray(data) ? data[0] : data
  return row ?? null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const supabase = auth.supabase

    const [rows, group, listings, developments] = await Promise.all([
      loadLocationRows(),
      supabase.from('countries').select('code, name, region, currency').order('name'),
      supabase.from('property_listings').select('country, city, country_id, city_id, area_id, status'),
      supabase.from('developments').select('country, city, country_id, city_id, area_id, status'),
    ])
    if (!rows) return NextResponse.json({ error: 'Could not read the location tables.' }, { status: 500 })

    // How many listings/developments use each row, and which text values
    // match nothing yet (so an admin can add them in one click).
    const usage: Record<string, number> = {}
    const unmatched = new Map<string, { country: string; city: string; listings: number; developments: number; countryKnown: boolean }>()
    const knownCountries = new Set(rows.countries.map((c) => c.name.toLowerCase()))
    const tally = (r: { country: string | null; city: string | null; country_id: string | null; city_id: string | null; area_id: string | null }, dev: boolean) => {
      for (const id of [r.country_id, r.city_id, r.area_id]) if (id) usage[id] = (usage[id] || 0) + 1
      if (!r.city_id && (r.city || r.country)) {
        const key = `${(r.country || '').toLowerCase()}|${(r.city || '').toLowerCase()}`
        const u = unmatched.get(key) || {
          country: r.country || '', city: r.city || '', listings: 0, developments: 0,
          countryKnown: knownCountries.has((r.country || '').toLowerCase()),
        }
        if (dev) u.developments++
        else u.listings++
        unmatched.set(key, u)
      }
    }
    for (const r of listings.data || []) tally(r, false)
    for (const r of developments.data || []) tally(r, true)

    return NextResponse.json({
      ...rows,
      groupCountries: group.data || [],
      usage,
      unmatched: [...unmatched.values()],
    })
  } catch (err) {
    logError('api.admin.locations', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { kind, data: body } = await request.json()
    if (!(kind in TABLE)) return NextResponse.json({ error: 'Unknown location type.' }, { status: 400 })

    const { data, error } = clean(kind, body || {}, true)
    if (error) return NextResponse.json({ error }, { status: 400 })

    // A country takes its name and currency from the group reference table
    // unless the admin typed their own. The name must match listing text.
    if (kind === 'country') {
      const { data: ref } = await auth.supabase.from('countries').select('name, currency').eq('code', data!.country_code).maybeSingle()
      if (!ref) return NextResponse.json({ error: 'That country is not in the reference list.' }, { status: 400 })
      data!.name = data!.name || ref.name
      data!.slug = data!.slug || slugify(String(data!.name))
      data!.currency = data!.currency || ref.currency
    }

    const { data: row, error: dbError } = await auth.supabase.from(TABLE[kind as Kind]).insert(data!).select().single()
    if (dbError) return NextResponse.json({ error: friendly(dbError) }, { status: 400 })

    const relinked = await resync(auth.supabase)
    await logActivity({ actorId: auth.userId, action: `location.${kind}_created`, targetId: row.id, metadata: { name: row.name, relinked } })
    return NextResponse.json({ data: row, relinked })
  } catch (err) {
    logError('api.admin.locations', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { kind, id, data: body } = await request.json()
    if (!(kind in TABLE)) return NextResponse.json({ error: 'Unknown location type.' }, { status: 400 })
    if (!UUID.test(String(id))) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

    const { data, error } = clean(kind, body || {}, false)
    if (error) return NextResponse.json({ error }, { status: 400 })
    if (!Object.keys(data!).length) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 })

    const { data: row, error: dbError } = await auth.supabase.from(TABLE[kind as Kind]).update(data!).eq('id', id).select().single()
    if (dbError) return NextResponse.json({ error: friendly(dbError) }, { status: 400 })

    const relinked = await resync(auth.supabase)
    await logActivity({ actorId: auth.userId, action: `location.${kind}_updated`, targetId: id, metadata: { changed: Object.keys(data!), relinked } })
    return NextResponse.json({ data: row, relinked })
  } catch (err) {
    logError('api.admin.locations', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind') as Kind
    const id = searchParams.get('id') || ''
    if (!(kind in TABLE)) return NextResponse.json({ error: 'Unknown location type.' }, { status: 400 })
    if (!UUID.test(id)) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

    // A location that listings use is switched off, not deleted: deleting
    // would silently unlink them.
    const col = LINK[kind]
    if (col) {
      const [l, d] = await Promise.all([
        auth.supabase.from('property_listings').select('id', { count: 'exact', head: true }).eq(col, id),
        auth.supabase.from('developments').select('id', { count: 'exact', head: true }).eq(col, id),
      ])
      const used = (l.count || 0) + (d.count || 0)
      if (used > 0) {
        return NextResponse.json(
          { error: `In use by ${used} listing${used === 1 ? '' : 's'} or development${used === 1 ? '' : 's'}. Switch it off instead to hide it.` },
          { status: 409 },
        )
      }
    }

    const { data: row } = await auth.supabase.from(TABLE[kind]).select('name').eq('id', id).maybeSingle()
    const { error } = await auth.supabase.from(TABLE[kind]).delete().eq('id', id)
    if (error) return NextResponse.json({ error: friendly(error) }, { status: 409 })

    await resync(auth.supabase)
    await logActivity({ actorId: auth.userId, action: `location.${kind}_deleted`, targetId: id, metadata: { name: row?.name } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.locations', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
