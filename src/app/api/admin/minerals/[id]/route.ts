import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { cleanOffer } from '@/lib/minerals'

/**
 * One mineral offer, for an admin: approve, reject, verify, change status,
 * edit, delete. Approval is what makes an offer public; "verified" is a
 * separate statement that CZAAH has seen the evidence, and needs a note
 * saying what was seen.
 */

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase, userId } = auth
    const { id } = await params
    const body = await request.json()
    const now = new Date().toISOString()

    const { data: offer } = await supabase.from('mineral_offers').select('id, reference, title, partner_id, status').eq('id', id).maybeSingle()
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })

    let updates: Record<string, unknown>
    let notice: { type: string; title: string; body: string } | null = null

    switch (body.action) {
      case 'approve':
        updates = { status: 'approved', approved_by: userId, approved_at: now, rejection_notes: null }
        notice = { type: 'property_approved', title: 'Mineral offer approved', body: `Your offer "${offer.title}" (${offer.reference}) is now live on CZAAH Minerals.` }
        break
      case 'reject': {
        const notes = String(body.notes || '').trim().slice(0, 1000) || 'No reason given.'
        updates = { status: 'rejected', rejection_notes: notes }
        notice = { type: 'property_rejected', title: 'Mineral offer not approved', body: `Your offer "${offer.title}" (${offer.reference}) was not approved. ${notes}` }
        break
      }
      case 'verify': {
        const notes = String(body.notes || '').trim().slice(0, 2000)
        if (!notes) return NextResponse.json({ error: 'Record what you checked (for example: assay report dated …, export licence no. …).' }, { status: 400 })
        updates = { verified: true, verified_by: userId, verified_at: now, verification_notes: notes }
        break
      }
      case 'unverify':
        updates = { verified: false, verified_by: null, verified_at: null }
        break
      case 'set_status':
        if (!['pending', 'approved', 'sold', 'inactive'].includes(body.status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
        updates = { status: body.status, ...(body.status === 'approved' ? { approved_by: userId, approved_at: now } : {}) }
        break
      case undefined: {
        const cleaned = cleanOffer(body)
        if (cleaned.problems.length || !cleaned.offer) return NextResponse.json({ error: cleaned.problems.join(' ') }, { status: 400 })
        updates = { ...cleaned.offer }
        if (Array.isArray(body.images)) updates.images = body.images.filter((i: unknown) => typeof i === 'string' && i).slice(0, 20)
        break
      }
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
    }

    const { error } = await supabase.from('mineral_offers').update({ ...updates, updated_at: now }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (notice && offer.partner_id) {
      const { error: noticeError } = await supabase.from('notifications').insert({
        user_id: offer.partner_id, ...notice, link: '/partner-network/minerals', is_read: false,
      })
      if (noticeError) logError('api.admin.minerals.id', noticeError, { step: 'notify-partner' })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.minerals.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { id } = await params
    const { error } = await auth.supabase.from('mineral_offers').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.minerals.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
