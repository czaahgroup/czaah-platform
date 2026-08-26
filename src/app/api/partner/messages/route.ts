import { NextRequest, NextResponse } from 'next/server'
import { requirePartner } from '@/lib/partnerAuth'
import { sendPushToUser } from '@/lib/serverPush'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { supabase, partner, userId } = auth

    const { data: chat } = await supabase!
      .from('partner_chats')
      .select('id')
      .eq('partner_id', partner!.id)
      .single()

    if (!chat) return NextResponse.json({ data: [], chatId: null, admin: null })

    const { data: messages, error } = await supabase!
      .from('partner_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Mark admin-sent messages as read now that the partner has opened the thread
    await supabase!
      .from('partner_messages')
      .update({ is_read: true })
      .eq('chat_id', chat.id)
      .neq('sender_id', userId)

    // A representative super_admin to ring — the call itself is broadcast
    // to the shared chat channel, so whichever super_admin has this
    // conversation open answers, regardless of which one this resolves to.
    const { data: admin } = await supabase!
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'super_admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ data: messages, chatId: chat.id, admin })
  } catch (err) {
    console.error('GET /api/partner/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { supabase, partner, userId } = auth

    const body = await request.json()
    const { content, relatedOpportunityId } = body
    if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 })

    const { data: chat } = await supabase!
      .from('partner_chats')
      .select('id')
      .eq('partner_id', partner!.id)
      .single()

    if (!chat) return NextResponse.json({ error: 'Inbox not found' }, { status: 404 })

    const { data: message, error } = await supabase!
      .from('partner_messages')
      .insert({
        chat_id: chat.id,
        sender_id: userId,
        content,
        related_opportunity_id: relatedOpportunityId || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase!.from('partner_chats').update({ last_message_at: new Date().toISOString() }).eq('id', chat.id)

    // Notify every super admin -- whichever one has this chat open answers,
    // so all of them should hear about a new message.
    const { data: senderProfile } = await supabase!.from('profiles').select('full_name').eq('id', userId).single()
    const { data: superAdmins } = await supabase!.from('profiles').select('id').eq('role', 'super_admin')
    if (superAdmins) {
      await Promise.allSettled(
        superAdmins.map((a) =>
          sendPushToUser(supabase!, a.id, {
            title: `New message from ${senderProfile?.full_name || 'a partner'}`,
            body: content.slice(0, 120),
            tag: 'czaah-new-message',
          })
        )
      )
    }

    return NextResponse.json({ success: true, data: message })
  } catch (err) {
    console.error('POST /api/partner/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
