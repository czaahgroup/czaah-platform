import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { logActivity } from '@/lib/activity'


export async function GET(
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

    // Get user profile for role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
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

    // Verify access
    if ((profile.role === 'member' || profile.role === 'elite_member' || profile.role === 'real_estate_partner') && enquiry.member_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if ((profile.role === 'admin' || profile.role === 'partner') && enquiry.assigned_admin_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // super_admin has full access

    // Fetch chat messages with sender profile info
    let messagesQuery = supabase
      .from('chat_messages')
      .select('*, profiles!chat_messages_sender_id_fkey(full_name, role)')
      .eq('enquiry_id', id)
      .order('created_at', { ascending: true })

    // Members and partners should not see internal admin notes
    if (profile.role === 'member' || profile.role === 'elite_member' || profile.role === 'real_estate_partner' || profile.role === 'partner') {
      messagesQuery = messagesQuery.eq('is_internal_note', false)
    }

    const { data: rawMessages, error: messagesError } = await messagesQuery

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    // Flatten profiles into sender_name/sender_role for the chat UI
    const messages = (rawMessages || []).map((msg: Record<string, unknown>) => {
      const profiles = msg.profiles as { full_name: string; role: string } | null
      return {
        ...msg,
        sender_name: profiles?.full_name || 'Unknown',
        sender_role: profiles?.role || 'member',
        profiles: undefined,
      }
    })

    // Fetch attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from('enquiry_attachments')
      .select('*')
      .eq('enquiry_id', id)
      .order('uploaded_at', { ascending: true })

    if (attachmentsError) {
      return NextResponse.json({ error: attachmentsError.message }, { status: 500 })
    }

    // Fetch member profile
    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', enquiry.member_id)
      .single()

    // Fetch assigned admin profile if exists
    let assignedAdmin = null
    if (enquiry.assigned_admin_id) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', enquiry.assigned_admin_id)
        .single()
      assignedAdmin = data
    }

    return NextResponse.json({
      data: {
        ...enquiry,
        member: memberProfile,
        assigned_admin: assignedAdmin,
        messages: messages || [],
        attachments: attachments || [],
      },
    })
  } catch (err) {
    logError("api.enquiries.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const ALLOWED_STATUSES = ['submitted', 'assigned', 'active', 'waiting', 'resolved', 'archived']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { data: enquiry } = await supabase.from('enquiries').select('*').eq('id', id).single()
    if (!enquiry) return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 })

    const isOwner = enquiry.member_id === user.id
    const isAssignee = enquiry.assigned_admin_id === user.id
    if (!isOwner && !isAssignee && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'resolved') updates.resolved_at = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('enquiries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await logActivity({
      actorId: user.id,
      action: 'enquiry.status_changed',
      targetType: 'enquiry',
      targetId: id,
      metadata: { to: status, reference: updated?.reference_number },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    logError("api.enquiries.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
