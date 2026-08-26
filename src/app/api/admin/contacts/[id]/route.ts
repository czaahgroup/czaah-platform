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
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: chatId } = await params
    const supabase = createAdminClient()

    // Get chat and verify user is a participant
    const { data: chat, error: chatError } = await supabase
      .from('admin_chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    if (chat.user_a_id !== user.id && chat.user_b_id !== user.id) {
      // Check if super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Mark unread messages as read
    await supabase
      .from('admin_messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    // Get both user profiles
    const otherId = chat.user_a_id === user.id ? chat.user_b_id : chat.user_a_id
    const { data: otherProfile } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .eq('id', otherId)
      .single()

    return NextResponse.json({
      data: {
        chat,
        messages: messages || [],
        otherUser: otherProfile,
      },
    })
  } catch (err) {
    console.error('GET /api/admin/contacts/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
