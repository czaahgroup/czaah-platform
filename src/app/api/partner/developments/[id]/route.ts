import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logError'
import { rateLimit } from '@/lib/rateLimit'
import { requireLister, checkedPhotos, notifyAdmins } from '@/lib/partnerListingAuth'
import { DEVELOPMENT_COLUMNS, UNIT_COLUMNS, loadPlansForUnits } from '@/lib/developments'
import { planFromStored } from '@/lib/listingEdits'
import { cleanDevelopment, projectActionResult } from '@/lib/partnerDevelopments'
import { proposeDeveloper, replaceUnits } from '@/lib/partnerDevelopmentStore'

/**
 * One of the caller's own developments.
 *
 * A project is edited freely while it is not on the site (awaiting approval
 * or withdrawn). A live project cannot be edited in place: the owner takes it
 * off the site to change it ("edit_live"), and it is approved again.
 */

type Ctx = { params: Promise<{ id: string }> }

async function loadOwn(request: NextRequest, id: string) {
  const auth = await requireLister(request)
  if (auth.error) return { error: auth.error }
  const { data: development } = await auth.supabase
    .from('developments')
    .select(`${DEVELOPMENT_COLUMNS}, created_by, development_units(${UNIT_COLUMNS})`)
    .eq('id', id)
    .maybeSingle()
  const row = development as unknown as (Record<string, unknown> & { created_by: string | null; status: string; name: string; currency: string; gallery: string[] | null; development_units: { id: string }[] }) | null
  // Not found rather than forbidden: another partner's project id tells nothing.
  if (!row || row.created_by !== auth.userId) return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) }
  return { ...auth, development: row }
}

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const own = await loadOwn(request, id)
    if (own.error) return own.error
    const units = [...(own.development.development_units || [])] as (Record<string, unknown> & { id: string; display_order?: number })[]
    units.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    const plans = await loadPlansForUnits(own.supabase, units.map((u) => u.id))
    return NextResponse.json({
      data: {
        ...own.development,
        development_units: units.map((u) => ({
          ...u,
          payment_plan: plans[u.id] ? planFromStored({ ...plans[u.id].plan, installments: plans[u.id].installments }) : null,
        })),
      },
    })
  } catch (err) {
    logError('api.partner.developments.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const own = await loadOwn(request, id)
    if (own.error) return own.error
    const { supabase, userId, development } = own

    if (!rateLimit(`development-edit:${userId}`, 60, 3600000).success) {
      return NextResponse.json({ error: 'Too many changes — try again in an hour.' }, { status: 429 })
    }
    const body = await request.json()

    if (body.action) {
      const result = projectActionResult(body.action, development.status)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      const { error } = await supabase.from('developments').update({ status: result.status, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (body.action === 'resubmit') {
        await notifyAdmins(supabase, 'Development resubmitted', `"${development.name}" was sent back for approval.`, '/admin/developments')
      }
      return NextResponse.json({ data: { id, status: result.status } })
    }

    if (development.status === 'published') {
      return NextResponse.json({ error: 'This project is live. Take it off the site to edit it, then it is approved again.' }, { status: 400 })
    }

    const cleaned = cleanDevelopment(body)
    if (cleaned.problems.length) return NextResponse.json({ error: cleaned.problems.join(' ') }, { status: 400 })
    const next = cleaned.development!

    const photos = await checkedPhotos(supabase, userId, body.photos, development.gallery || [])
    if (cleaned.newDeveloper) {
      const logo = (await checkedPhotos(supabase, userId, body.newDeveloper?.logo ? [body.newDeveloper.logo] : [], []))[0] || null
      const proposed = await proposeDeveloper(supabase, userId, { ...cleaned.newDeveloper, logo_url: logo })
      if (proposed.error) return NextResponse.json({ error: proposed.error }, { status: 400 })
      next.developer_name = proposed.name
    }

    // The slug (public address) is kept, so a link shared earlier still works.
    const { error } = await supabase
      .from('developments')
      .update({ ...next, featured_image: photos[0] || null, gallery: photos, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const saved = await replaceUnits(supabase, id, cleaned.units!, next.currency)
    if (saved.error) return NextResponse.json({ error: saved.error }, { status: 400 })

    return NextResponse.json({ data: { id, status: development.status }, warnings: saved.warnings })
  } catch (err) {
    logError('api.partner.developments.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const own = await loadOwn(request, id)
    if (own.error) return own.error
    if (own.development.status === 'published') {
      return NextResponse.json({ error: 'A live project cannot be deleted. Withdraw it first.' }, { status: 400 })
    }
    // Units, their payment plans and instalments cascade.
    const { error } = await own.supabase.from('developments').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.partner.developments.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
