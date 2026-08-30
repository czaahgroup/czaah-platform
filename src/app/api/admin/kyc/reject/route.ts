import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { logError } from '@/lib/logError'


export async function POST(request: NextRequest) {
  try {
    // Verify caller is super_admin
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can reject applications' }, { status: 403 })
    }

    const { userId, reason } = await request.json()
    if (!userId || !reason) {
      return NextResponse.json({ error: 'userId and reason required' }, { status: 400 })
    }

    // Update profile status
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ status: 'rejected' })
      .eq('id', userId)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Update all KYC documents
    await adminClient
      .from('kyc_documents')
      .update({
        review_status: 'rejected',
        reviewed_by: user.id,
        rejection_reason: reason,
      })
      .eq('user_id', userId)

    // Create notification
    await adminClient.from('notifications').insert({
      user_id: userId,
      type: 'kyc_rejected',
      title: 'KYC Review Update',
      body: `Your application requires attention: ${reason}`,
      link: '/pending',
    })

    // Get user profile for email
    const { data: profile } = await adminClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    // Send rejection email
    if (profile) {
      await resend.emails.send({
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
                Resubmit Application
              </a>
            </div>
            <p style="color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; margin-top: 32px;">
              &copy; 2026 CZAAH. All rights reserved.
            </p>
          </div>
        `,
      })
    }

    // Audit log
    await adminClient.from('audit_log').insert({
      actor_id: user.id,
      action: 'kyc_rejected',
      target_type: 'profile',
      target_id: userId,
      metadata: { email: profile?.email, reason },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logError("api.admin.kyc.reject", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
