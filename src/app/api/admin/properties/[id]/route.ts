import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL } from '@/lib/resend/client'

export const runtime = 'edge';

function createAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
}

function wrapEmail(inner: string) {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; background: #000000; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #C9A84C; font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 6px; margin: 0;">CZAAH</h1>
        <p style="color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 4px; margin-top: 8px;">CAPITAL · VENTURES · INFRASTRUCTURE</p>
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userClient = createAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, notes } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject.' }, { status: 400 })
    }

    // Get property with partner info
    const { data: property } = await supabase
      .from('property_listings')
      .select('*, profiles!property_listings_partner_id_fkey(full_name, email)')
      .eq('id', id)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (action === 'approve') {
      updates.status = 'approved'
      updates.approved_by = user.id
      updates.approved_at = new Date().toISOString()
    } else {
      updates.status = 'rejected'
      updates.rejection_notes = notes || 'No reason provided.'
    }

    const { data: updated, error: updateError } = await supabase
      .from('property_listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Notify partner
    const partnerProfile = property.profiles as { full_name: string; email: string } | null

    await supabase.from('notifications').insert({
      user_id: property.partner_id,
      type: action === 'approve' ? 'property_approved' : 'property_rejected',
      title: action === 'approve' ? 'Property Approved' : 'Property Rejected',
      body: action === 'approve'
        ? `Your property "${property.title}" has been approved and is now live.`
        : `Your property "${property.title}" has been rejected. ${notes || ''}`,
      link: '/dashboard/properties',
      is_read: false,
    })

    // Email notification
    if (partnerProfile?.email) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: partnerProfile.email,
          subject: action === 'approve'
            ? `Property Approved: ${property.title}`
            : `Property Update: ${property.title}`,
          html: wrapEmail(
            action === 'approve'
              ? `
                <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px 0;">Property Approved</h2>
                <p style="color: rgba(255,255,255,0.6); line-height: 1.6;">
                  Your property listing "<strong style="color: #fff;">${property.title}</strong>" has been approved and is now visible to all members.
                </p>
                <a href="https://czaah.com/dashboard/properties" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">
                  View Listing &rarr;
                </a>
              `
              : `
                <h2 style="color: #ef4444; font-size: 20px; margin: 0 0 16px 0;">Property Rejected</h2>
                <p style="color: rgba(255,255,255,0.6); line-height: 1.6;">
                  Your property listing "<strong style="color: #fff;">${property.title}</strong>" was not approved.
                </p>
                ${notes ? `<p style="color: rgba(255,255,255,0.6); line-height: 1.6;"><strong>Reason:</strong> ${notes}</p>` : ''}
                <a href="https://czaah.com/dashboard/properties" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">
                  View Details &rarr;
                </a>
              `
          ),
        })
      } catch (emailErr) {
        console.error('Failed to send property notification email:', emailErr)
      }
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('PATCH /api/admin/properties/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
