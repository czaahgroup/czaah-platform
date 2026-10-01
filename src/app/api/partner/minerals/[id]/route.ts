import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logError'
import { rateLimit } from '@/lib/rateLimit'
import { requireMineralPartner, checkedPhotos, notifyAdmins } from '@/lib/partnerListingAuth'
import { cleanOffer, mineralActionResult } from '@/lib/minerals'

/**
 * One of the caller's own mineral offers.
 *
 * Editing an offer that is not on the site saves straight away. Editing a
 * live offer takes it off the site until an admin approves it again — the
 * details of a mineral offer (grade, quantity, price) are exactly what a
 * buyer relies on, so a changed offer is a new claim to review.
 */

type Ctx = { params: Promise<{ id: string }> }

async function loadOwn(request: NextRequest, id: string) {
  const auth = await requireMineralPartner(request)
  if (auth.error) return { error: auth.error }
  const { data: offer } = await auth.supabase.from('mineral_offers').select('*').eq('id', id).maybeSingle()
  // Not found rather than forbidden: another partner's offer id tells nothing.
  if (!offer || offer.partner_id !== auth.userId) return { error: NextResponse.json({ error: 'Offer not found' }, { status: 404 }) }
  return { ...auth, offer }
}

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const own = await loadOwn(request, id)
    if (own.error) return own.error
    const { verification_notes: _notes, ...offer } = own.offer
    return NextResponse.json({ data: offer })
  } catch (err) {
    logError('api.partner.minerals.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const own = await loadOwn(request, id)
    if (own.error) return own.error
    const { supabase, userId, offer } = own

    if (!rateLimit(`mineral-edit:${userId}`, 60, 3600000).success) {
      return NextResponse.json({ error: 'Too many changes — try again in an hour.' }, { status: 429 })
    }
    const body = await request.json()
    const now = new Date().toISOString()

    if (body.action) {
      const result = mineralActionResult(body.action, offer.status)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      const { error } = await supabase
        .from('mineral_offers')
        .update({ status: result.status, updated_at: now, ...(result.status === 'pending' ? { rejection_notes: null } : {}) })
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (result.status === 'pending') {
        await notifyAdmins(supabase, 'Mineral offer resubmitted', `"${offer.title}" (${offer.reference}) was sent back for approval.`, '/admin/minerals')
      }
      return NextResponse.json({ data: { id, status: result.status } })
    }

    const cleaned = cleanOffer(body)
    if (cleaned.problems.length || !cleaned.offer) return NextResponse.json({ error: cleaned.problems.join(' ') }, { status: 400 })
    // Photos are only replaced when the request carries them; an edit that
    // sends none leaves the existing ones alone rather than wiping them.
    const images = body.images === undefined ? offer.images || [] : await checkedPhotos(supabase, userId, body.images, offer.images || [])

    // Live or turned down: the edited offer goes back for approval. A changed
    // offer is no longer the one that was verified.
    const review = offer.status === 'approved' || offer.status === 'rejected'
    const { error } = await supabase
      .from('mineral_offers')
      .update({
        ...cleaned.offer,
        images,
        updated_at: now,
        ...(review ? { status: 'pending', rejection_notes: null, verified: false, verified_by: null, verified_at: null } : {}),
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (review) {
      await notifyAdmins(supabase, 'Mineral offer changed', `"${cleaned.offer.title}" (${offer.reference}) was edited and is waiting for approval.`, '/admin/minerals')
    }
    return NextResponse.json({ data: { id, status: review ? 'pending' : offer.status } })
  } catch (err) {
    logError('api.partner.minerals.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const own = await loadOwn(request, id)
    if (own.error) return own.error
    if (own.offer.status === 'approved') {
      return NextResponse.json({ error: 'A live offer cannot be deleted. Withdraw it first.' }, { status: 400 })
    }
    // Requests about it are kept (their offer link is cleared, the title stays).
    const { error } = await own.supabase.from('mineral_offers').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.partner.minerals.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
