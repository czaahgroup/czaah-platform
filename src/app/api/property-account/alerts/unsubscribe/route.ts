import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'

/**
 * POST { token } — the "Stop alerts" link in an alert email. Works without
 * signing in: the token is the saved search's private alert_token. It only
 * ever switches alerts OFF, so a leaked token can do nothing worse.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`alert-unsub:${ip}`, 30, 3600_000).success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: 'This link is not valid.' }, { status: 400 })
  try {
    const { data, error } = await createAdminClient().from('saved_searches').update({ email_alerts: false }).eq('alert_token', token).select('name').maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'This link is not valid, or the search was deleted.' }, { status: 404 })
    return NextResponse.json({ success: true, name: data.name })
  } catch (err) {
    logError('api.property-account.alerts.unsubscribe', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
