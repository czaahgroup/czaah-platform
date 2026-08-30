import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


function getAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getAuthClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify super_admin role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, notes } = body

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
    }

    // Fetch the deal
    const { data: deal } = await adminClient
      .from('investment_opportunities')
      .select('id, approval_status, submitted_by, title')
      .eq('id', id)
      .single()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    if (deal.approval_status !== 'pending_approval') {
      return NextResponse.json({ error: 'Deal is not pending approval' }, { status: 400 })
    }

    if (action === 'approve') {
      const { error } = await adminClient
        .from('investment_opportunities')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          status: 'draft', // Admin can then publish it
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        logError("api.admin.investments.id.approve", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Reject
      const { error } = await adminClient
        .from('investment_opportunities')
        .update({
          approval_status: 'rejected',
          approval_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        logError("api.admin.investments.id.approve", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Send notification to partner
    if (deal.submitted_by) {
      try {
        await adminClient
          .from('notifications')
          .insert({
            user_id: deal.submitted_by,
            type: action === 'approve' ? 'deal_approved' : 'deal_rejected',
            title: action === 'approve'
              ? `Deal "${deal.title}" has been approved`
              : `Deal "${deal.title}" has been rejected`,
            message: action === 'approve'
              ? 'Your investment deal has been approved by the admin team and is now in draft status.'
              : `Your investment deal has been rejected.${notes ? ` Reason: ${notes}` : ''}`,
            read: false,
          })
      } catch {
        // Notification insert may fail if table doesn't exist yet — non-blocking
        logError('api.admin.investments.approve', new Error('Could not send notification to partner'), { step: 'could-not-send-notification-to-partner' })
      }
    }

    return NextResponse.json({ success: true, action })
  } catch (err) {
    logError("api.admin.investments.id.approve", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
