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

    // Verify current user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all admin profiles excluding current user
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .in('role', ['super_admin', 'admin'])
      .neq('id', user.id)
      .order('full_name')

    if (adminsError) {
      return NextResponse.json({ error: adminsError.message }, { status: 500 })
    }

    // Get existing admin chats for this user with last message info
    const { data: chats } = await supabase
      .from('admin_chats')
      .select('*')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    // For each chat, get last message and unread count
    const chatDetails = await Promise.all(
      (chats || []).map(async (chat) => {
        const otherId = chat.user_a_id === user.id ? chat.user_b_id : chat.user_a_id

        const { data: lastMsg } = await supabase
          .from('admin_messages')
          .select('content, file_name, sender_id, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const { count } = await supabase
          .from('admin_messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_read', false)
          .neq('sender_id', user.id)

        return {
          ...chat,
          other_user_id: otherId,
          last_message: lastMsg?.content || (lastMsg?.file_name ? 'Attachment' : null),
          last_message_at: lastMsg?.created_at || chat.created_at,
          last_message_sender_id: lastMsg?.sender_id || null,
          unread_count: count || 0,
        }
      })
    )

    return NextResponse.json({ data: { admins: admins || [], chats: chatDetails } })
  } catch (err) {
    console.error('GET /api/admin/contacts error:', err)
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
    const { targetId } = body

    if (!targetId) {
      return NextResponse.json({ error: 'targetId required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify both are admins
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role')
      .in('id', [user.id, targetId])

    if (!profiles || profiles.length < 2) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const allAdmin = profiles.every((p) => ['super_admin', 'admin'].includes(p.role))
    if (!allAdmin) {
      return NextResponse.json({ error: 'Both users must be admins' }, { status: 403 })
    }

    // Use LEAST/GREATEST pattern for consistent ordering
    const userA = user.id < targetId ? user.id : targetId
    const userB = user.id < targetId ? targetId : user.id

    // Check if chat already exists
    const { data: existing } = await supabase
      .from('admin_chats')
      .select('*')
      .eq('user_a_id', userA)
      .eq('user_b_id', userB)
      .single()

    if (existing) {
      return NextResponse.json({ data: existing })
    }

    // Create new chat
    const { data: chat, error } = await supabase
      .from('admin_chats')
      .insert({
        user_a_id: userA,
        user_b_id: userB,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create admin chat:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: chat })
  } catch (err) {
    console.error('POST /api/admin/contacts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
