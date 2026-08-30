import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userClient = createAuthClient(request)
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

    // Get chat
    const { data: chat } = await supabase
      .from('property_chats')
      .select(`
        id,
        property_id,
        enquirer_id,
        partner_id,
        property_listings!property_chats_property_id_fkey(title, images),
        enquirer:profiles!property_chats_enquirer_id_fkey(full_name),
        partner:profiles!property_chats_partner_id_fkey(full_name)
      `)
      .eq('id', id)
      .single()

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Check access
    const isSuperAdmin = profile?.role === 'super_admin'
    if (!isSuperAdmin && chat.enquirer_id !== user.id && chat.partner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('property_messages')
      .select('*')
      .eq('chat_id', id)
      .order('created_at', { ascending: true })

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Mark messages as read
    if (!isSuperAdmin) {
      await supabase
        .from('property_messages')
        .update({ is_read: true })
        .eq('chat_id', id)
        .neq('sender_id', user.id)
        .eq('is_read', false)
    }

    return NextResponse.json({ chat, messages: messages || [] })
  } catch (err) {
    logError("api.property-chat.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
