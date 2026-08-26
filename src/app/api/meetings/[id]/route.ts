import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

function getAuthClient(request: NextRequest) {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select(`
        *,
        organizer:profiles!meetings_organizer_id_fkey(id, full_name, email, avatar_url),
        meeting_participants(
          id, user_id, response,
          profile:profiles!meeting_participants_user_id_fkey(id, full_name, email, avatar_url)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Verify access: organizer, participant, or super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isOrganizer = meeting.organizer_id === user.id
    const isParticipant = meeting.meeting_participants?.some((p: { user_id: string }) => p.user_id === user.id)
    const isSuperAdmin = profile?.role === 'super_admin'

    if (!isOrganizer && !isParticipant && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data: meeting })
  } catch (err) {
    console.error('GET /api/meetings/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()

    // Check if this is a participant response (accept/decline)
    if (body.response) {
      const { error } = await supabase
        .from('meeting_participants')
        .update({ response: body.response })
        .eq('meeting_id', id)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data: { updated: true } })
    }

    // Otherwise update the meeting itself (organizer only)
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organizer_id')
      .eq('id', id)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (meeting.organizer_id !== user.id && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (body.title) updates.title = body.title
    if (body.scheduledAt) updates.scheduled_at = body.scheduledAt
    if (body.durationMinutes) updates.duration_minutes = body.durationMinutes
    if (body.meetingType) updates.meeting_type = body.meetingType
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.status) updates.status = body.status

    const { data: updated, error: updateError } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('PATCH /api/meetings/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: meeting } = await supabase
      .from('meetings')
      .select('organizer_id')
      .eq('id', id)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (meeting.organizer_id !== user.id && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Cancel instead of hard delete
    const { error } = await supabase
      .from('meetings')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { cancelled: true } })
  } catch (err) {
    console.error('DELETE /api/meetings/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
