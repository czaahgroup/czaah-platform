import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { accountUrl, accountLink } from '@/lib/buyerAccount'
import { accountEmail } from '../email'

/** Public: email a password-reset link. Always answers the same way. */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`buyer-forgot:${ip}`, 10, 3600_000).success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!rateLimit(`buyer-forgot-email:${email}`, 3, 3600_000).success) {
    return NextResponse.json({ success: true })
  }
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.generateLink({ type: 'recovery', email })
    // Unknown address: say nothing different.
    if (error || !data?.properties?.hashed_token) return NextResponse.json({ success: true })
    const base = accountUrl(request.headers.get('host'), new URL(request.url).origin)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your CZAAH password',
      html: accountEmail(
        'Reset your password',
        'Use the button below to choose a new password for your CZAAH account. If you did not ask for this, you can ignore this email — your password stays the same.',
        accountLink(base, 'reset', data.properties.hashed_token),
        'Choose a new password',
      ),
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.property-account.forgot', err)
    return NextResponse.json({ success: true })
  }
}
