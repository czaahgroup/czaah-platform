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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params
    const supabase = createAdminClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('group_chat_members')
      .select('id')
      .eq('chat_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      // Check super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Get group info
    const { data: group } = await supabase
      .from('group_chats')
      .select('*')
      .eq('id', groupId)
      .single()

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get messages
    const { data: messages } = await supabase
      .from('group_messages')
      .select('*')
      .eq('chat_id', groupId)
      .order('created_at', { ascending: true })

    // Get members with profiles
    const { data: members } = await supabase
      .from('group_chat_members')
      .select('user_id, joined_at')
      .eq('chat_id', groupId)

    const memberIds = (members || []).map((m) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .in('id', memberIds)

    // Mark messages as read by this user
    // Update is_read_by to include this user for messages they haven't read
    const unreadMessages = (messages || []).filter(
      (m) => m.sender_id !== user.id && !(m.is_read_by || []).includes(user.id)
    )

    for (const msg of unreadMessages) {
      const currentReadBy = msg.is_read_by || []
      await supabase
        .from('group_messages')
        .update({ is_read_by: [...currentReadBy, user.id] })
        .eq('id', msg.id)
    }

    return NextResponse.json({
      data: {
        group,
        messages: messages || [],
        members: profiles || [],
      },
    })
  } catch (err) {
    console.error('GET /api/admin/groups/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params
    const supabase = createAdminClient()

    // Get group and verify ownership
    const { data: group } = await supabase
      .from('group_chats')
      .select('created_by')
      .eq('id', groupId)
      .single()

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if creator or super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (group.created_by !== user.id && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('group_chats')
      .update({ name })
      .eq('id', groupId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('PATCH /api/admin/groups/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params
    const supabase = createAdminClient()

    // Get group and verify ownership
    const { data: group } = await supabase
      .from('group_chats')
      .select('created_by')
      .eq('id', groupId)
      .single()

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (group.created_by !== user.id && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('group_chats')
      .delete()
      .eq('id', groupId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('DELETE /api/admin/groups/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
