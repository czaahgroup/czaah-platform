import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { cleanOffer } from '@/lib/minerals'

/**
 * Admin → Minerals: every offer (with who submitted it) and every request.
 * An offer an admin adds is CZAAH's own (no partner) and goes live at once.
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const [offers, rfqs] = await Promise.all([
      auth.supabase.from('mineral_offers').select('*, profiles!mineral_offers_partner_id_fkey(full_name, email)').order('created_at', { ascending: false }),
      auth.supabase.from('mineral_rfqs').select('*').order('created_at', { ascending: false }).limit(500),
    ])
    if (offers.error) return NextResponse.json({ error: offers.error.message }, { status: 500 })
    if (rfqs.error) return NextResponse.json({ error: rfqs.error.message }, { status: 500 })
    return NextResponse.json({ offers: offers.data || [], rfqs: rfqs.data || [] })
  } catch (err) {
    logError('api.admin.minerals', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const body = await request.json()
    const { offer, problems } = cleanOffer(body)
    if (problems.length || !offer) return NextResponse.json({ error: problems.join(' ') }, { status: 400 })

    // Admin photos are storage paths or URLs from the admin uploader.
    const images = Array.isArray(body.images) ? body.images.filter((i: unknown) => typeof i === 'string' && i).slice(0, 20) : []
    const { data, error } = await auth.supabase
      .from('mineral_offers')
      .insert({ ...offer, images, partner_id: null, status: 'approved', approved_by: auth.userId, approved_at: new Date().toISOString() })
      .select('id, reference')
      .single()
    if (error || !data) return NextResponse.json({ error: error?.message || 'Could not save the offer.' }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    logError('api.admin.minerals', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
