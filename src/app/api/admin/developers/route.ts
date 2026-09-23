import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { logActivity } from '@/lib/activity'
import { slugify } from '@/lib/plots'

/**
 * Admin → Developers (brief §10, §19). Developers link to developments and
 * listings by their name (a database trigger); after every change the links
 * are re-resolved, so renaming or adding a developer relinks its projects.
 */

const STATUSES = ['unverified', 'pending', 'verified', 'rejected', 'expired']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const text = (v: unknown, max: number) => {
  const s = v == null ? '' : String(v).trim()
  return s ? s.slice(0, max) : null
}

function clean(body: Record<string, unknown>, creating: boolean) {
  const d: Record<string, unknown> = {}
  const has = (k: string) => k in body
  if (creating || has('name')) {
    const name = text(body.name, 150)
    if (!name) return { error: 'A name is required.' }
    d.name = name
  }
  if (has('slug') || creating) {
    const slug = slugify(String(body.slug || d.name || ''))
    if (!slug) return { error: 'A URL slug is required.' }
    d.slug = slug
  }
  for (const [k, max] of [['logo_url', 1000], ['description', 4000], ['email', 254], ['phone', 50], ['verification_notes', 2000]] as const) {
    if (has(k)) d[k] = text(body[k], max)
  }
  if (has('website')) {
    const w = text(body.website, 300)
    d.website = w && !/^https?:\/\//i.test(w) ? `https://${w}` : w
  }
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email))) return { error: 'Email is not a valid address.' }
  if (has('active')) d.active = body.active === true
  if (has('verification_status')) {
    if (!STATUSES.includes(String(body.verification_status))) return { error: 'Invalid verification status.' }
    d.verification_status = body.verification_status
  }
  return { data: d }
}

function friendly(err: { code?: string; message?: string }) {
  if (err.code === '23505') return 'A developer with that name or URL already exists.'
  if (err.code === '23514') return 'The URL slug may only contain lower-case letters, numbers and hyphens.'
  return err.message || 'Save failed.'
}

async function setCountries(supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'], id: string, countryIds: unknown) {
  if (!Array.isArray(countryIds)) return
  const ids = countryIds.map(String).filter((c) => UUID.test(c))
  await supabase!.from('property_developer_countries').delete().eq('developer_id', id)
  if (ids.length) await supabase!.from('property_developer_countries').insert(ids.map((country_id) => ({ developer_id: id, country_id })))
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const [devs, links, countries, projects] = await Promise.all([
      auth.supabase.from('property_developers').select('*').order('name'),
      auth.supabase.from('property_developer_countries').select('developer_id, country_id'),
      auth.supabase.from('property_countries').select('id, name, active').order('name'),
      auth.supabase.from('developments').select('developer_id, developer_name, status'),
    ])
    if (devs.error) return NextResponse.json({ error: devs.error.message }, { status: 500 })
    const known = new Set((devs.data || []).map((d) => d.name.toLowerCase()))
    return NextResponse.json({
      data: (devs.data || []).map((d) => ({
        ...d,
        country_ids: (links.data || []).filter((l) => l.developer_id === d.id).map((l) => l.country_id),
        project_count: (projects.data || []).filter((p) => p.developer_id === d.id).length,
      })),
      countries: countries.data || [],
      // Developer names on projects that match no developer yet.
      unmatched: [...new Set((projects.data || []).filter((p) => !p.developer_id && p.developer_name && !known.has(p.developer_name.toLowerCase())).map((p) => p.developer_name))],
    })
  } catch (err) {
    logError('api.admin.developers', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const body = await request.json()
    const { data, error } = clean(body || {}, true)
    if (error) return NextResponse.json({ error }, { status: 400 })
    if (data!.verification_status === 'verified') Object.assign(data!, { verified_at: new Date().toISOString(), verified_by: auth.userId })
    const { data: row, error: dbError } = await auth.supabase.from('property_developers').insert(data!).select().single()
    if (dbError) return NextResponse.json({ error: friendly(dbError) }, { status: 400 })
    await setCountries(auth.supabase, row.id, body.country_ids)
    const { data: relinked } = await auth.supabase.rpc('resync_property_developers')
    await logActivity({ actorId: auth.userId, action: 'developer.created', targetId: row.id, metadata: { name: row.name } })
    return NextResponse.json({ data: row, relinked })
  } catch (err) {
    logError('api.admin.developers', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const body = await request.json()
    if (!UUID.test(String(body.id))) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
    const { data, error } = clean(body || {}, false)
    if (error) return NextResponse.json({ error }, { status: 400 })

    // Verification is recorded with who and when (brief §19).
    if ('verification_status' in data!) {
      const { data: before } = await auth.supabase.from('property_developers').select('verification_status').eq('id', body.id).maybeSingle()
      if (before && before.verification_status !== data!.verification_status) {
        Object.assign(data!, data!.verification_status === 'verified'
          ? { verified_at: new Date().toISOString(), verified_by: auth.userId }
          : { verified_at: null, verified_by: null })
      }
    }
    if (Object.keys(data!).length) {
      const { error: dbError } = await auth.supabase.from('property_developers').update(data!).eq('id', body.id)
      if (dbError) return NextResponse.json({ error: friendly(dbError) }, { status: 400 })
    }
    await setCountries(auth.supabase, body.id, body.country_ids)
    const { data: relinked } = await auth.supabase.rpc('resync_property_developers')
    await logActivity({ actorId: auth.userId, action: 'developer.updated', targetId: body.id, metadata: { changed: Object.keys(data!) } })
    return NextResponse.json({ success: true, relinked })
  } catch (err) {
    logError('api.admin.developers', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const id = new URL(request.url).searchParams.get('id') || ''
    if (!UUID.test(id)) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
    const [d, l] = await Promise.all([
      auth.supabase.from('developments').select('id', { count: 'exact', head: true }).eq('developer_id', id),
      auth.supabase.from('property_listings').select('id', { count: 'exact', head: true }).eq('developer_id', id),
    ])
    const used = (d.count || 0) + (l.count || 0)
    if (used) return NextResponse.json({ error: `Linked to ${used} project${used === 1 ? '' : 's'} or listing${used === 1 ? '' : 's'}. Switch it off instead to hide it.` }, { status: 409 })
    const { error } = await auth.supabase.from('property_developers').delete().eq('id', id)
    if (error) return NextResponse.json({ error: friendly(error) }, { status: 400 })
    await logActivity({ actorId: auth.userId, action: 'developer.deleted', targetId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.developers', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
