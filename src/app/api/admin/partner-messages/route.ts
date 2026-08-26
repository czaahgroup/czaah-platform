import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

function createAuthClient(request: NextRequest) {
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

async function requireSuperAdmin(request: NextRequest) {
  const userClient = createAuthClient(request)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase, userId: user.id }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chat_id')

    if (chatId) {
      const { data: messages, error } = await auth.supabase!
        .from('partner_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Mark partner-sent messages as read now that admin has opened the thread
      await auth.supabase!
        .from('partner_messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', auth.userId)

      return NextResponse.json({ data: messages })
    }

    const { data: chats, error } = await auth.supabase!
      .from('partner_chats')
      .select('*, partners(id, partner_id, profile_id, profiles!partners_profile_id_fkey(full_name, email)), partner_messages(id, is_read, sender_id)')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: chats })
  } catch (err) {
    console.error('GET /api/admin/partner-messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error
    const supabase = auth.supabase!

    const body = await request.json()
    const { chatId, content, relatedOpportunityId } = body

    if (!chatId || !content) {
      return NextResponse.json({ error: 'chatId and content are required' }, { status: 400 })
    }

    const { data: message, error } = await supabase
      .from('partner_messages')
      .insert({
        chat_id: chatId,
        sender_id: auth.userId,
        content,
        related_opportunity_id: relatedOpportunityId || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('partner_chats').update({ last_message_at: new Date().toISOString() }).eq('id', chatId)

    return NextResponse.json({ success: true, data: message })
  } catch (err) {
    console.error('POST /api/admin/partner-messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error
    const supabase = auth.supabase!

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chat_id')
    if (!chatId) {
      return NextResponse.json({ error: 'chat_id is required' }, { status: 400 })
    }

    const { data: chat, error: chatError } = await supabase
      .from('partner_chats')
      .select('id')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('partner_messages')
      .delete()
      .eq('chat_id', chatId)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    await supabase.from('partner_chats').update({ last_message_at: null }).eq('id', chatId)

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('DELETE /api/admin/partner-messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
