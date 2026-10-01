import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logError'
import { rateLimit } from '@/lib/rateLimit'
import { requireLister, checkedPhotos, notifyAdmins } from '@/lib/partnerListingAuth'
import { cleanListingEdit, changedOnly, ownerActionResult } from '@/lib/listingEdits'

/**
 * One of the caller's own listings.
 *
 * Editing depends on where the listing is:
 *  - awaiting approval, withdrawn or sold: saved straight away (it is not public);
 *  - not approved: saved and sent back for approval;
 *  - live: held as a proposal until a super admin accepts it — the site keeps
 *    the approved version meanwhile.
 * Taking a listing off the site (sold / withdraw) is immediate.
 */

type Ctx = { params: Promise<{ id: string }> }

async function loadOwn(request: NextRequest, id: string) {
  const auth = await requireLister(request)
  if (auth.error) return { error: auth.error }
  const { data: listing } = await auth.supabase.from('property_listings').select('*').eq('id', id).maybeSingle()
  if (!listing) return { error: NextResponse.json({ error: 'Property not found' }, { status: 404 }) }
  // Not found rather than forbidden: another partner's listing id tells nothing.
  if (listing.partner_id !== auth.userId) return { error: NextResponse.json({ error: 'Property not found' }, { status: 404 }) }
  return { ...auth, listing }
}

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const own = await loadOwn(request, id)
    if (own.error) return own.error
    const { data: change } = await own.supabase
      .from('property_listing_changes')
      .select('changes, status, note, submitted_at, reviewed_at')
      .eq('listing_id', id)
      .maybeSingle()
    return NextResponse.json({ data: { ...own.listing, change: change || null } })
  } catch (err) {
    logError('api.partner.properties.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const own = await loadOwn(request, id)
    if (own.error) return own.error
    const { supabase, userId, listing } = own

    if (!rateLimit(`property-edit:${userId}`, 60, 3600000).success) {
      return NextResponse.json({ error: 'Too many changes — try again in an hour.' }, { status: 429 })
    }

    const body = await request.json()
    const now = new Date().toISOString()

    // ── Status actions ────────────────────────────────────────────────────
    if (body.action) {
      const result = ownerActionResult(body.action, listing.status)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

      if (body.action === 'cancel_changes' || body.action === 'withdraw' || body.action === 'mark_sold') {
        // A proposal for a listing that is leaving the site has nothing to apply to.
        await supabase.from('property_listing_changes').delete().eq('listing_id', id)
      }
      if (!result.status) return NextResponse.json({ data: listing })

      const updates: Record<string, unknown> = { status: result.status, updated_at: now }
      if (result.status === 'pending') updates.rejection_notes = null
      const { data, error } = await supabase.from('property_listings').update(updates).eq('id', id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      if (result.status === 'pending') {
        await notifyAdmins(supabase, 'Property resubmitted', `"${listing.title}" was sent back for approval.`)
      }
      return NextResponse.json({ data })
    }

    // ── Edit ──────────────────────────────────────────────────────────────
    const { columns, problems } = cleanListingEdit(body)
    if (problems.length) return NextResponse.json({ error: problems.join(' ') }, { status: 400 })
    if (body.images !== undefined) {
      columns.images = await checkedPhotos(supabase, userId, body.images, listing.images || [])
    }
    const changes = changedOnly(columns, listing)

    if (listing.status === 'approved') {
      if (!Object.keys(changes).length) {
        await supabase.from('property_listing_changes').delete().eq('listing_id', id)
        return NextResponse.json({ data: listing, message: 'Nothing was changed.' })
      }
      const { error } = await supabase.from('property_listing_changes').upsert({
        listing_id: id,
        changes,
        status: 'pending',
        note: null,
        submitted_by: userId,
        submitted_at: now,
        reviewed_by: null,
        reviewed_at: null,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      await notifyAdmins(supabase, 'Listing changes to review', `Changes to "${listing.title}" are waiting for approval.`)
      return NextResponse.json({
        data: listing,
        held: true,
        message: 'Your changes were sent for approval. The listing stays live as it is until they are accepted.',
      })
    }

    const resubmit = listing.status === 'rejected'
    const { data, error } = await supabase
      .from('property_listings')
      .update({ ...changes, updated_at: now, ...(resubmit ? { status: 'pending', rejection_notes: null } : {}) })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (resubmit) await notifyAdmins(supabase, 'Property resubmitted', `"${data.title}" was edited and sent back for approval.`)

    return NextResponse.json({
      data,
      message: resubmit ? 'Saved and sent back for approval.' : 'Saved.',
    })
  } catch (err) {
    logError('api.partner.properties.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const own = await loadOwn(request, id)
    if (own.error) return own.error

    // A listing that has been live may have enquiries and viewings attached;
    // those are withdrawn, not deleted.
    if (own.listing.status !== 'pending' && own.listing.status !== 'rejected') {
      return NextResponse.json({ error: 'Only a listing that has not been approved can be deleted. Withdraw it instead.' }, { status: 400 })
    }
    const { error } = await own.supabase.from('property_listings').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.partner.properties.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
