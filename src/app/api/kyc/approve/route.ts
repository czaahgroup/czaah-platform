import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL } from '@/lib/resend/client'


export async function POST(request: Request) {
  const { userId } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Send approval email
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: profile.email,
    subject: 'Welcome to CZAAH Group — Membership Approved',
    html: `
      <div style="font-family: 'Raleway', Arial, sans-serif; background: #000000; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #C9A84C; font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 6px; margin: 0;">CZAAH</h1>
          <p style="color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 4px; margin-top: 8px;">CAPITAL · VENTURES · INFRASTRUCTURE</p>
        </div>
        <div style="background: #080808; border: 1px solid #1A1A1A; border-radius: 8px; padding: 32px;">
          <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px 0;">Welcome, ${profile.full_name}</h2>
          <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 24px 0;">
            Your membership application has been approved. You now have full access to CZAAH Group's platform — including all sectors, services, and investment opportunities.
          </p>
          <a href="https://czaah.com/dashboard" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Access Your Dashboard →
          </a>
        </div>
        <p style="color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; margin-top: 32px;">
          © 2026 CZAAH. All rights reserved.
        </p>
      </div>
    `,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log the action
  await supabase.from('audit_log').insert({
    action: 'kyc_approved',
    target_type: 'profile',
    target_id: userId,
    metadata: { email: profile.email },
  })

  return NextResponse.json({ success: true })
}
