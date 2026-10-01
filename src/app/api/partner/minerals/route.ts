import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logError'
import { rateLimit } from '@/lib/rateLimit'
import { requireMineralPartner, checkedPhotos, notifyAdmins } from '@/lib/partnerListingAuth'
import { cleanOffer } from '@/lib/minerals'

/**
 * A partner's own mineral offers. Whatever a partner submits starts pending:
 * only an admin makes an offer public (Admin → Minerals).
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMineralPartner(request)
    if (auth.error) return auth.error
    const { data, error } = await auth.supabase
      .from('mineral_offers')
      .select('*')
      .eq('partner_id', auth.userId)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Verification notes are CZAAH's own record, not the seller's.
    return NextResponse.json({ data: (data || []).map(({ verification_notes: _notes, ...o }) => o) })
  } catch (err) {
    logError('api.partner.minerals', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMineralPartner(request)
    if (auth.error) return auth.error
    const { supabase, userId } = auth

    if (!rateLimit(`mineral-create:${userId}`, 15, 3600000).success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { offer, problems } = cleanOffer(body)
    if (problems.length || !offer) return NextResponse.json({ error: problems.join(' ') }, { status: 400 })

    const images = await checkedPhotos(supabase, userId, body.images, [])
    const { data, error } = await supabase
      .from('mineral_offers')
      .insert({
        ...offer,
        images,
        partner_id: userId,
        // A partner can never publish or verify their own offer.
        status: 'pending',
        verified: false,
      })
      .select('id, reference, title, status')
      .single()
    if (error || !data) return NextResponse.json({ error: error?.message || 'Could not save the offer.' }, { status: 500 })

    await notifyAdmins(supabase, 'New mineral offer to review', `"${data.title}" (${data.reference}) was submitted by a partner.`, '/admin/minerals')
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    logError('api.partner.minerals', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
