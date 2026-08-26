import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL } from '@/lib/resend/client'

export async function POST(request: Request) {
  const { userId, reason } = await request.json()

  if (!userId || !reason) {
    return NextResponse.json({ error: 'userId and reason required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: profile.email,
    subject: 'CZAAH Group — Application Update',
    html: `
      <div style="font-family: 'Raleway', Arial, sans-serif; background: #000000; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #C9A84C; font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 6px; margin: 0;">CZAAH</h1>
          <p style="color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 4px; margin-top: 8px;">CAPITAL · VENTURES · INFRASTRUCTURE</p>
        </div>
        <div style="background: #080808; border: 1px solid #1A1A1A; border-radius: 8px; padding: 32px;">
          <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0;">Application Update</h2>
          <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
            Dear ${profile.full_name},
          </p>
          <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
            Unfortunately, we were unable to verify your application at this time.
          </p>
          <div style="background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.2); border-radius: 4px; padding: 16px; margin: 0 0 24px 0;">
            <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 14px;">
              <strong style="color: #ffffff;">Reason:</strong> ${reason}
            </p>
          </div>
          <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 24px 0;">
            You may resubmit your application with the required corrections.
          </p>
          <a href="https://czaah.com/pending" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Resubmit Application →
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

  await supabase.from('audit_log').insert({
    action: 'kyc_rejected',
    target_type: 'profile',
    target_id: userId,
    metadata: { email: profile.email, reason },
  })

  return NextResponse.json({ success: true })
}
