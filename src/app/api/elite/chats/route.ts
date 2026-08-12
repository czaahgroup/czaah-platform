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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Build query based on role
    let query = supabase
      .from('direct_chats')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (profile.role === 'elite_member') {
      query = query.eq('elite_member_id', user.id)
    } else if (profile.role === 'admin') {
      query = query.eq('admin_id', user.id)
    } else if (profile.role === 'super_admin') {
      // super_admin can see all, or filter to their own
      const { searchParams } = new URL(request.url)
      if (searchParams.get('mine') === 'true') {
        query = query.eq('admin_id', user.id)
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: chats, error: chatError } = await query

    if (chatError) {
      return NextResponse.json({ error: chatError.message }, { status: 500 })
    }

    // Enrich each chat with participant names, last message, and unread count
    const enrichedChats = await Promise.all(
      (chats || []).map(async (chat) => {
        // Get admin profile
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', chat.admin_id)
          .single()

        // Get elite member profile
        const { data: memberProfile } = await supabase
          .from('profiles')
          .select('full_name, company_name')
          .eq('id', chat.elite_member_id)
          .single()

        // Get last message
        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('content, created_at, sender_id')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Get unread count for current user
        const { count: unreadCount } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_read', false)
          .neq('sender_id', user.id)

        return {
          ...chat,
          admin_name: adminProfile?.full_name || 'Unknown Admin',
          admin_role: adminProfile?.role || 'admin',
          member_name: memberProfile?.full_name || 'Unknown Member',
          member_company: memberProfile?.company_name || null,
          last_message: lastMsg?.content || null,
          last_message_at: lastMsg?.created_at || chat.last_message_at,
          last_message_sender_id: lastMsg?.sender_id || null,
          unread_count: unreadCount || 0,
        }
      })
    )

    return NextResponse.json({ data: enrichedChats })
  } catch (err) {
    console.error('GET /api/elite/chats error:', err)
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

    // Verify user is elite_member or super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'elite_member' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Only elite members can start direct chats' }, { status: 403 })
    }

    const body = await request.json()
    const { adminId } = body

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 })
    }

    // Verify target is an admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Target user is not an admin' }, { status: 400 })
    }

    // Check if a chat already exists between these two
    const { data: existingChat } = await supabase
      .from('direct_chats')
      .select('*')
      .eq('elite_member_id', user.id)
      .eq('admin_id', adminId)
      .single()

    if (existingChat) {
      return NextResponse.json({ data: existingChat })
    }

    // Create new chat
    const { data: newChat, error: createError } = await supabase
      .from('direct_chats')
      .insert({
        elite_member_id: user.id,
        admin_id: adminId,
      })
      .select()
      .single()

    if (createError || !newChat) {
      return NextResponse.json({ error: createError?.message || 'Failed to create chat' }, { status: 500 })
    }

    return NextResponse.json({ data: newChat }, { status: 201 })
  } catch (err) {
    console.error('POST /api/elite/chats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
