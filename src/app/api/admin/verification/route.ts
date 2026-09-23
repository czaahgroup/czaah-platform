import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { logActivity } from '@/lib/activity'
import { cleanVerification, TARGET_TABLE } from '@/lib/verification'

const FIELDS = 'id, verified, verified_at, verified_by, verification_checks, verification_notes'

/**
 * Admin → Verification. The ONLY place a listing or development gets (or
 * loses) its public "Verified" badge: verifying requires every required
 * check and a note, and records who and when.
 *   GET   listings + developments with their verification record
 *   POST  { target, id, verified, checks?, notes? }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const db = auth.supabase
    const [listings, developments] = await Promise.all([
      db.from('property_listings').select(`${FIELDS}, title, city, country, status, listing_type, created_at`).order('created_at', { ascending: false }).limit(500),
      db.from('developments').select(`${FIELDS}, name, slug, city, country, status, developer_name, created_at`).order('created_at', { ascending: false }).limit(200),
    ])
    if (listings.error || developments.error) throw listings.error || developments.error
    const ids = [...(listings.data || []), ...(developments.data || [])].map((r) => r.verified_by).filter(Boolean)
    const { data: people } = ids.length ? await db.from('profiles').select('id, full_name').in('id', ids) : { data: [] }
    const name = new Map((people || []).map((p) => [p.id, p.full_name]))
    const withName = <T extends { verified_by: string | null }>(r: T) => ({ ...r, verified_by_name: r.verified_by ? name.get(r.verified_by) || 'Admin' : null })
    return NextResponse.json({
      listings: (listings.data || []).map(withName),
      developments: (developments.data || []).map(withName),
    })
  } catch (err) {
    logError('api.admin.verification.get', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const v = cleanVerification(await request.json().catch(() => null))
    if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 })

    const update = v.verified
      ? { verified: true, verified_by: auth.userId, verification_checks: v.checks, verification_notes: v.notes, verified_at: new Date().toISOString() }
      // Keep the notes (why it was removed), clear the rest (the trigger does too).
      : { verified: false, verified_by: null, verification_checks: null, verification_notes: v.notes }
    const { data, error } = await auth.supabase.from(TARGET_TABLE[v.target]).update(update).eq('id', v.id).select('id').maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await logActivity({
      actorId: auth.userId,
      action: v.verified ? `${v.target}.verified` : `${v.target}.verification_removed`,
      targetId: v.id,
      metadata: { checks: v.checks, notes: v.notes },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.verification.post', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
