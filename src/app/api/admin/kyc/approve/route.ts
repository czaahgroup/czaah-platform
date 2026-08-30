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
      return NextResponse.json({ error: 'Only super admins can approve applications' }, { status: 403 })
    }

    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Update profile status
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', userId)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Update all KYC documents
    await adminClient
      .from('kyc_documents')
      .update({ review_status: 'approved', reviewed_by: user.id })
      .eq('user_id', userId)

    // Create notification
    await adminClient.from('notifications').insert({
      user_id: userId,
      type: 'kyc_approved',
      title: 'KYC Approved',
      body: 'Welcome to CZAAH Group. Your membership is now active.',
      link: '/dashboard',
    })

    // Get user profile for email
    const { data: profile } = await adminClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    // Send approval email
    if (profile) {
      await resend.emails.send({
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
                Access Your Dashboard
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
      action: 'kyc_approved',
      target_type: 'profile',
      target_id: userId,
      metadata: { email: profile?.email },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logError("api.admin.kyc.approve", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
