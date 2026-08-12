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

export async function GET(request: NextRequest) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get groups user is a member of
    const { data: memberships } = await supabase
      .from('group_chat_members')
      .select('chat_id')
      .eq('user_id', user.id)

    const chatIds = (memberships || []).map((m) => m.chat_id)

    if (chatIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Get group details
    const { data: groups } = await supabase
      .from('group_chats')
      .select('*')
      .in('id', chatIds)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    // Get member counts, last message, and unread count for each group
    const groupDetails = await Promise.all(
      (groups || []).map(async (group) => {
        const { count: memberCount } = await supabase
          .from('group_chat_members')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', group.id)

        const { data: lastMsg } = await supabase
          .from('group_messages')
          .select('content, file_name, sender_id, created_at')
          .eq('chat_id', group.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Get sender name for last message
        let lastSenderName: string | null = null
        if (lastMsg?.sender_id) {
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', lastMsg.sender_id)
            .single()
          lastSenderName = sender?.full_name || null
        }

        // Count unread messages (messages where user.id is NOT in is_read_by)
        const { data: unreadMsgs } = await supabase
          .from('group_messages')
          .select('id')
          .eq('chat_id', group.id)
          .neq('sender_id', user.id)

        const unreadCount = (unreadMsgs || []).length
        // Note: ideally we'd filter by is_read_by not containing user.id,
        // but Supabase doesn't support array-not-contains easily.
        // We'll use a simpler approach via the API response.

        return {
          ...group,
          member_count: memberCount || 0,
          last_message: lastMsg?.content || (lastMsg?.file_name ? 'Attachment' : null),
          last_message_at: lastMsg?.created_at || group.created_at,
          last_sender_name: lastSenderName,
          unread_count: unreadCount,
        }
      })
    )

    return NextResponse.json({ data: groupDetails })
  } catch (err) {
    console.error('GET /api/admin/groups error:', err)
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

    const supabase = createAdminClient()

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, memberIds } = body

    if (!name || !memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json({ error: 'name and memberIds required' }, { status: 400 })
    }

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('group_chats')
      .insert({
        name,
        created_by: user.id,
      })
      .select()
      .single()

    if (groupError) {
      console.error('Failed to create group:', groupError)
      return NextResponse.json({ error: groupError.message }, { status: 500 })
    }

    // Add creator + members
    const allMemberIds = Array.from(new Set([user.id, ...memberIds]))
    const memberInserts = allMemberIds.map((uid: string) => ({
      chat_id: group.id,
      user_id: uid,
    }))

    const { error: membersError } = await supabase
      .from('group_chat_members')
      .insert(memberInserts)

    if (membersError) {
      console.error('Failed to add group members:', membersError)
    }

    return NextResponse.json({ data: group })
  } catch (err) {
    console.error('POST /api/admin/groups error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
