import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'

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

/**
 * Authenticates the caller and resolves (creating if needed) their
 * registrant_chats row. Only Employer and Employment Promoter (OEP)
 * accounts can use this inbox to reach Super Admin.
 */
async function requireRegistrant(request: NextRequest) {
  const userClient = createAuthClient(request)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['employer', 'oep_partner'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  let { data: chat } = await supabase
    .from('registrant_chats')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!chat) {
    const { data: newChat, error: createError } = await supabase
      .from('registrant_chats')
      .insert({ profile_id: user.id })
      .select('id')
      .single()
    if (createError || !newChat) {
      return { error: NextResponse.json({ error: 'Failed to open inbox' }, { status: 500 }) }
    }
    chat = newChat
  }

  return { supabase, userId: user.id, chatId: chat.id }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRegistrant(request)
    if (auth.error) return auth.error
    const { supabase, chatId, userId } = auth

    const { data: messages, error } = await supabase!
      .from('registrant_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Mark admin-sent messages as read now that the registrant has opened the thread
    await supabase!
      .from('registrant_messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', userId)

    return NextResponse.json({ data: messages })
  } catch (err) {
    console.error('GET /api/registrant/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRegistrant(request)
    if (auth.error) return auth.error
    const { supabase, chatId, userId } = auth

    const body = await request.json()
    const { content } = body
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const { data: message, error } = await supabase!
      .from('registrant_messages')
      .insert({ chat_id: chatId, sender_id: userId, content: content.trim() })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase!.from('registrant_chats').update({ last_message_at: new Date().toISOString() }).eq('id', chatId)

    return NextResponse.json({ success: true, data: message })
  } catch (err) {
    console.error('POST /api/registrant/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
