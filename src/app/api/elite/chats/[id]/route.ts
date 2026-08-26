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
    const { id: chatId } = await params
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get chat and verify participation
    const { data: chat, error: chatError } = await supabase
      .from('direct_chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Verify user is a participant or super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isParticipant = chat.elite_member_id === user.id || chat.admin_id === user.id
    const isSuperAdmin = profile?.role === 'super_admin'

    if (!isParticipant && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Mark unread messages as read
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    // Get participant profiles
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', chat.admin_id)
      .single()

    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', chat.elite_member_id)
      .single()

    return NextResponse.json({
      data: {
        ...chat,
        admin_name: adminProfile?.full_name || 'Unknown Admin',
        admin_role: adminProfile?.role || 'admin',
        member_name: memberProfile?.full_name || 'Unknown Member',
        member_company: memberProfile?.company_name || null,
        messages: messages || [],
      },
    })
  } catch (err) {
    console.error('GET /api/elite/chats/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden — only a super admin can clear chat history' }, { status: 403 })
    }

    const { data: chat, error: chatError } = await supabase
      .from('direct_chats')
      .select('id')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Best-effort cleanup of any uploaded files before deleting the rows
    const { data: filesToDelete } = await supabase
      .from('direct_messages')
      .select('file_url')
      .eq('chat_id', chatId)
      .not('file_url', 'is', null)

    const paths = (filesToDelete || []).map((m) => m.file_url).filter(Boolean) as string[]
    if (paths.length > 0) {
      await supabase.storage.from('platform-files').remove(paths)
    }

    const { error: deleteError } = await supabase
      .from('direct_messages')
      .delete()
      .eq('chat_id', chatId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    await supabase
      .from('direct_chats')
      .update({ last_message_at: null })
      .eq('id', chatId)

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('DELETE /api/elite/chats/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
