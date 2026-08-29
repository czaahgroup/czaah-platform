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

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: notifications })
  } catch (err) {
    console.error('GET /api/notifications error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { notificationId, markAllRead } = body

    if (markAllRead) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data: { marked: 'all' } })
    }

    if (notificationId) {
      const { data: notification } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('id', notificationId)
        .single()

      if (!notification || notification.user_id !== user.id) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data: { marked: notificationId } })
    }

    return NextResponse.json(
      { error: 'Provide notificationId or markAllRead: true' },
      { status: 400 }
    )
  } catch (err) {
    console.error('PATCH /api/notifications error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
