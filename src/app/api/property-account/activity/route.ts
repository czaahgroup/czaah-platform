import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'

/**
 * GET: the signed-in buyer's own enquiries and viewing requests, for
 * /account. Leads are private tables, so this reads them server-side and
 * returns only what the buyer themselves sent — never internal notes,
 * assignment or deal links.
 */
export async function GET() {
  try {
    const { data: { user } } = await (await createClient()).auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
    const db = createAdminClient()
    const { data, error } = await db
      .from('property_leads')
      .select('id, reference, kind, status, listing_id, listing_title, created_at, property_viewings(status, preferred_date, preferred_slot, scheduled_at, mode)')
      .eq('user_id', user.id)
      .neq('status', 'spam')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return NextResponse.json({
      data: (data || []).map(({ property_viewings, status, ...l }) => ({
        ...l,
        // Buyers see a simple open / closed state, not the sales pipeline.
        open: !['won', 'lost'].includes(status),
        viewing: Array.isArray(property_viewings) && property_viewings[0] ? property_viewings[0] : null,
      })),
    })
  } catch (err) {
    logError('api.property-account.activity', err)
    return NextResponse.json({ error: 'Could not load your requests.' }, { status: 500 })
  }
}
