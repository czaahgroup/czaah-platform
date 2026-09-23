import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'
import { escapeHtml } from '@/lib/escapeHtml'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { cleanRegistration, accountUrl, accountLink, BUYER_ACCOUNT_TYPE } from '@/lib/buyerAccount'
import { accountEmail } from '../email'

/**
 * Public: create a CZAAH Properties buyer account (see src/lib/buyerAccount.ts).
 *
 * The response never says whether the email was already registered. A new
 * address gets a confirmation link; a known one gets a "you already have an
 * account" email with a password-reset link instead.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`buyer-register:${ip}`, 10, 3600_000).success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }
  const body = await request.json().catch(() => null)
  // Honeypot: bots that fill it get a normal-looking success.
  if (body && typeof body.company_site === 'string' && body.company_site.trim()) {
    return NextResponse.json({ success: true })
  }
  const { data, error } = cleanRegistration(body)
  if (error) return NextResponse.json({ error }, { status: 400 })
  // Per-address limit too, so nobody can flood someone's inbox.
  if (!rateLimit(`buyer-register-email:${data!.email}`, 3, 3600_000).success) {
    return NextResponse.json({ success: true })
  }

  const base = accountUrl(request.headers.get('host'), new URL(request.url).origin)
  const supabase = createAdminClient()
  try {
    const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: data!.email,
      password: data!.password,
      options: { data: { account_type: BUYER_ACCOUNT_TYPE, full_name: data!.full_name } },
    })

    if (linkError && linkError.code === 'email_exists') {
      const { data: rec, error: recError } = await supabase.auth.admin.generateLink({ type: 'recovery', email: data!.email })
      if (recError || !rec?.properties?.hashed_token) throw recError || new Error('no recovery token')
      await resend.emails.send({
        from: FROM_EMAIL,
        to: data!.email,
        subject: 'You already have a CZAAH account',
        html: accountEmail(
          'You already have an account',
          `Someone — hopefully you — tried to create a CZAAH Properties account with this email address, but one already exists. You can sign in with your existing password, or set a new one below. If this wasn't you, you can ignore this email.`,
          accountLink(base, 'reset', rec.properties.hashed_token),
          'Set a new password',
        ),
      })
      return NextResponse.json({ success: true })
    }
    if (linkError || !link?.properties?.hashed_token) throw linkError || new Error('no signup token')

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data!.email,
      subject: 'Confirm your CZAAH Properties account',
      html: accountEmail(
        `Welcome, ${escapeHtml(data!.full_name)}`,
        'Please confirm your email address to finish creating your CZAAH Properties account. You can then save properties and searches and pick them up on any device.',
        accountLink(base, 'confirm', link.properties.hashed_token),
        'Confirm my email',
      ),
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.property-account.register', err)
    return NextResponse.json({ error: 'We could not create your account just now. Please try again.' }, { status: 500 })
  }
}
