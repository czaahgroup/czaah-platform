import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function GET(request: NextRequest) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const upcoming = searchParams.get('upcoming')

    // Get meetings where user is organizer or participant
    let query = supabase
      .from('meetings')
      .select(`
        *,
        organizer:profiles!meetings_organizer_id_fkey(id, full_name, email, avatar_url),
        meeting_participants(
          id, user_id, response,
          profile:profiles!meeting_participants_user_id_fkey(id, full_name, email, avatar_url)
        )
      `)
      .or(`organizer_id.eq.${user.id},id.in.(${
        // Subquery: meetings where user is a participant
        `select meeting_id from meeting_participants where user_id = '${user.id}'`
      })`)
      .order('scheduled_at', { ascending: true })

    if (upcoming === 'true') {
      query = query
        .gte('scheduled_at', new Date().toISOString())
        .neq('status', 'cancelled')
    }

    const { data: meetings, error: queryError } = await query

    if (queryError) {
      // Fallback: try simpler query if subquery syntax fails
      const { data: orgMeetings } = await supabase
        .from('meetings')
        .select(`
          *,
          organizer:profiles!meetings_organizer_id_fkey(id, full_name, email, avatar_url),
          meeting_participants(
            id, user_id, response,
            profile:profiles!meeting_participants_user_id_fkey(id, full_name, email, avatar_url)
          )
        `)
        .eq('organizer_id', user.id)
        .order('scheduled_at', { ascending: true })

      const { data: partRecords } = await supabase
        .from('meeting_participants')
        .select('meeting_id')
        .eq('user_id', user.id)

      const partMeetingIds = (partRecords || []).map(p => p.meeting_id)

      let invitedMeetings: typeof orgMeetings = []
      if (partMeetingIds.length > 0) {
        const { data } = await supabase
          .from('meetings')
          .select(`
            *,
            organizer:profiles!meetings_organizer_id_fkey(id, full_name, email, avatar_url),
            meeting_participants(
              id, user_id, response,
              profile:profiles!meeting_participants_user_id_fkey(id, full_name, email, avatar_url)
            )
          `)
          .in('id', partMeetingIds)
          .order('scheduled_at', { ascending: true })
        invitedMeetings = data
      }

      // Merge and deduplicate
      const allMeetings = [...(orgMeetings || []), ...(invitedMeetings || [])]
      const seen = new Set<string>()
      const deduplicated = allMeetings.filter(m => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })

      // Filter upcoming if needed
      const filtered = upcoming === 'true'
        ? deduplicated.filter(m => new Date(m.scheduled_at) >= new Date() && m.status !== 'cancelled')
        : deduplicated

      filtered.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

      return NextResponse.json({ data: filtered })
    }

    return NextResponse.json({ data: meetings })
  } catch (err) {
    console.error('GET /api/meetings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, scheduledAt, durationMinutes, meetingType, notes, participantIds } = body

    if (!title || !scheduledAt || !meetingType) {
      return NextResponse.json({ error: 'title, scheduledAt, and meetingType are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get organizer profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Create meeting
    const { data: meeting, error: insertError } = await supabase
      .from('meetings')
      .insert({
        title,
        organizer_id: user.id,
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes || 30,
        meeting_type: meetingType,
        notes: notes || null,
        status: 'scheduled',
      })
      .select()
      .single()

    if (insertError || !meeting) {
      return NextResponse.json({ error: insertError?.message || 'Failed to create meeting' }, { status: 500 })
    }

    // Add participants
    if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
      const participants = participantIds.map((uid: string) => ({
        meeting_id: meeting.id,
        user_id: uid,
        response: 'pending',
      }))

      await supabase.from('meeting_participants').insert(participants)

      // Create notifications for participants
      const scheduledDate = new Date(scheduledAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })

      const notifications = participantIds.map((uid: string) => ({
        user_id: uid,
        type: 'meeting_invite' as const,
        title: 'Meeting Invitation',
        body: `${profile?.full_name || 'Someone'} invited you to "${title}" on ${scheduledDate}.`,
        link: `/dashboard/meetings`,
        is_read: false,
      }))

      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json({ data: meeting }, { status: 201 })
  } catch (err) {
    console.error('POST /api/meetings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
