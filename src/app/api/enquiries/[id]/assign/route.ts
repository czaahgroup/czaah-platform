import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'


function wrapEmail(inner: string) {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; background: #000000; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #C9A84C; font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 6px; margin: 0;">CZAAH</h1>
        <p style="color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 4px; margin-top: 8px;">CAPITAL &middot; VENTURES &middot; INFRASTRUCTURE</p>
      </div>
      <div style="background: #080808; border: 1px solid #1A1A1A; border-radius: 8px; padding: 32px;">
        ${inner}
      </div>
      <p style="color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; margin-top: 32px;">
        &copy; 2026 CZAAH. All rights reserved.
      </p>
    </div>
  `
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate user
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Verify caller is super_admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden — super_admin only' }, { status: 403 })
    }

    const { adminId } = await request.json()
    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 })
    }

    // Fetch enquiry
    const { data: enquiry, error: enquiryError } = await supabase
      .from('enquiries')
      .select('*')
      .eq('id', id)
      .single()

    if (enquiryError || !enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 })
    }

    // Verify the assignee exists and has a role enquiries can be handed to —
    // either internal staff, or a Partner Network partner with sector access.
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', adminId)
      .single()

    if (!adminProfile || !['admin', 'super_admin', 'partner'].includes(adminProfile.role)) {
      return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 })
    }

    // Verify admin has sector assignment (skip for super_admin role)
    if (adminProfile.role === 'admin' && enquiry.sector_id) {
      const { data: sectorAssignment } = await supabase
        .from('admin_sector_assignments')
        .select('id')
        .eq('admin_id', adminId)
        .eq('sector_id', enquiry.sector_id)
        .single()

      if (!sectorAssignment) {
        return NextResponse.json(
          { error: 'Admin is not assigned to this sector' },
          { status: 400 }
        )
      }
    }

    // Verify partner has sector access (partner_sector_access is keyed by
    // partners.id, not profiles.id, so resolve the partner row first)
    if (adminProfile.role === 'partner' && enquiry.sector_id) {
      const { data: partnerRow } = await supabase
        .from('partners')
        .select('id')
        .eq('profile_id', adminId)
        .single()

      const hasSectorAccess = partnerRow && await supabase
        .from('partner_sector_access')
        .select('id')
        .eq('partner_id', partnerRow.id)
        .eq('sector_id', enquiry.sector_id)
        .single()

      if (!partnerRow || !hasSectorAccess?.data) {
        return NextResponse.json(
          { error: 'Partner does not have access to this sector' },
          { status: 400 }
        )
      }
    }

    // Update enquiry
    const { data: updatedEnquiry, error: updateError } = await supabase
      .from('enquiries')
      .update({
        assigned_admin_id: adminId,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Get member profile
    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', enquiry.member_id)
      .single()

    const assigneeLink = adminProfile.role === 'partner' ? `/partner-network/enquiries/${id}` : `/admin/enquiries/${id}`

    // Notification for the assignee
    await supabase.from('notifications').insert({
      user_id: adminId,
      type: 'enquiry_assigned',
      title: 'Enquiry Assigned to You',
      body: `You have been assigned enquiry ${enquiry.reference_number}.`,
      link: assigneeLink,
      is_read: false,
    })

    // Notification for the member
    await supabase.from('notifications').insert({
      user_id: enquiry.member_id,
      type: 'enquiry_assigned',
      title: 'Enquiry Assigned',
      body: `Your enquiry ${enquiry.reference_number} has been assigned to ${adminProfile.full_name}. You will receive a response shortly.`,
      link: `/dashboard/enquiries/${id}`,
      is_read: false,
    })

    // System message in the chat
    await supabase.from('chat_messages').insert({
      enquiry_id: id,
      sender_id: user.id,
      message_type: 'system',
      content: `This enquiry has been assigned to ${adminProfile.full_name}. They will review your enquiry and respond shortly.`,
      is_internal_note: false,
      is_read: false,
    })

    // Email to assignee
    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminProfile.email,
      subject: `Enquiry Assigned — ${enquiry.reference_number}`,
      html: wrapEmail(`
        <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px 0;">Enquiry Assigned</h2>
        <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${adminProfile.full_name}, you have been assigned a new enquiry.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0;">
          <tr>
            <td style="color: rgba(255,255,255,0.4); padding: 8px 0; font-size: 13px;">Reference</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 13px;">${enquiry.reference_number}</td>
          </tr>
          <tr>
            <td style="color: rgba(255,255,255,0.4); padding: 8px 0; font-size: 13px;">Product</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 13px;">${enquiry.product_name}</td>
          </tr>
          <tr>
            <td style="color: rgba(255,255,255,0.4); padding: 8px 0; font-size: 13px;">Member</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 13px;">${memberProfile?.full_name || 'N/A'}</td>
          </tr>
        </table>
        <a href="https://czaah.com${assigneeLink}" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">
          View Enquiry &rarr;
        </a>
      `),
    })

    // Email to member
    if (memberProfile) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: memberProfile.email,
        subject: `Enquiry Update — ${enquiry.reference_number}`,
        html: wrapEmail(`
          <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px 0;">Your Enquiry Has Been Assigned</h2>
          <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
            Dear ${memberProfile.full_name}, your enquiry <strong style="color: #ffffff;">${enquiry.reference_number}</strong> has been assigned to a specialist who will be in touch shortly.
          </p>
          <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 24px 0;">
            You can track progress and communicate directly through your portal.
          </p>
          <a href="https://czaah.com/dashboard/enquiries/${id}" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">
            View Enquiry &rarr;
          </a>
        `),
      })
    }

    await logActivity({
      actorId: user.id,
      action: 'enquiry.assigned',
      targetType: 'enquiry',
      targetId: id,
      metadata: { reference: enquiry.reference_number, assignee_id: adminId, assignee_role: adminProfile.role },
    })

    return NextResponse.json({ data: updatedEnquiry })
  } catch (err) {
    logError('api.enquiries.assign', err, { enquiryId: (await params).id })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
