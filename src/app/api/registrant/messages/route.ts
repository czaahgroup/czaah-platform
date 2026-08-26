import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/serverPush'

export const runtime = 'edge'

// Staff (admin/super_admin) use their own back-office inbox instead, and
// the Partner Network ('partner' role) has its own dedicated chat+call
// system — everyone else gets this one shared Live Chat to reach support.
const STAFF_OR_PARTNER_ROLES = ['admin', 'super_admin', 'partner']

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
 * registrant_chats row. Every member-facing role shares this one Live
 * Chat inbox to reach Czaah support/admin.
 */
async function requireMember(request: NextRequest) {
  const userClient = createAuthClient(request)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || STAFF_OR_PARTNER_ROLES.includes(profile.role)) {
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
    const auth = await requireMember(request)
    if (auth.error) return auth.error
    const { supabase, chatId, userId } = auth

    const { data: messages, error } = await supabase!
      .from('registrant_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Mark admin-sent messages as read now that the member has opened the thread
    await supabase!
      .from('registrant_messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', userId)

    // A representative super_admin to ring — the call itself is broadcast
    // to the shared chat channel, so whichever staff member has this
    // conversation open answers, regardless of which one this resolves to.
    const { data: admin } = await supabase!
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'super_admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ data: messages, chatId, admin })
  } catch (err) {
    console.error('GET /api/registrant/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMember(request)
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

    // Notify every staff member — whichever one has this chat open answers.
    const { data: senderProfile } = await supabase!.from('profiles').select('full_name').eq('id', userId).single()
    const { data: staff } = await supabase!.from('profiles').select('id').in('role', ['admin', 'super_admin'])
    if (staff) {
      await Promise.allSettled(
        staff.map((s) =>
          sendPushToUser(supabase!, s.id, {
            title: `New message from ${senderProfile?.full_name || 'a member'}`,
            body: content.slice(0, 120),
            tag: 'czaah-new-message',
            url: '/admin/registrant-messages',
          })
        )
      )
    }

    return NextResponse.json({ success: true, data: message })
  } catch (err) {
    console.error('POST /api/registrant/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
