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

export async function POST(request: NextRequest) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { callerId, receiverId, callType, status, durationSeconds, chatContextType, chatContextId } = body

    if (!callerId || !receiverId || !callType || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the caller is the authenticated user (either as caller or receiver)
    if (callerId !== user.id && receiverId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!['voice', 'video'].includes(callType)) {
      return NextResponse.json({ error: 'Invalid call type' }, { status: 400 })
    }

    if (!['missed', 'declined', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('call_log')
      .insert({
        caller_id: callerId,
        receiver_id: receiverId,
        call_type: callType,
        status,
        duration_seconds: durationSeconds || 0,
        chat_context_type: chatContextType || null,
        chat_context_id: chatContextId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to log call:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create notification for missed/declined calls
    if (status === 'missed' || status === 'declined') {
      try {
        // Get caller name
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', callerId)
          .single()

        const callerName = callerProfile?.full_name || 'Someone'
        const typeLabel = callType === 'video' ? 'video' : 'voice'
        const statusLabel = status === 'missed' ? 'missed' : 'declined'

        await supabase.from('notifications').insert({
          user_id: receiverId,
          type: 'missed_call',
          title: 'Missed Call',
          body: `You ${statusLabel} a ${typeLabel} call from ${callerName}`,
          link: '/admin/contacts',
        })
      } catch (notifErr) {
        // Notification is best-effort, don't fail the main request
        console.warn('Failed to create missed call notification:', notifErr)
      }
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('POST /api/calls/log error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
