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

export async function GET(request: NextRequest) {
  try {
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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let query = supabase
      .from('property_chats')
      .select(`
        id,
        property_id,
        enquirer_id,
        partner_id,
        created_at,
        last_message_at,
        property_listings!property_chats_property_id_fkey(title, images),
        enquirer:profiles!property_chats_enquirer_id_fkey(full_name),
        partner:profiles!property_chats_partner_id_fkey(full_name)
      `)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    // Filter based on role
    if (profile.role === 'super_admin') {
      // sees all
    } else {
      query = query.or(`enquirer_id.eq.${user.id},partner_id.eq.${user.id}`)
    }

    const { data: chats, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get unread counts and last messages
    const enrichedChats = await Promise.all((chats || []).map(async (chat) => {
      const { count } = await supabase
        .from('property_messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .eq('is_read', false)
        .neq('sender_id', user.id)

      const { data: lastMsg } = await supabase
        .from('property_messages')
        .select('content, file_name, sender_id, created_at')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        ...chat,
        unread_count: count || 0,
        last_message: lastMsg?.content || lastMsg?.file_name || null,
        last_message_sender_id: lastMsg?.sender_id || null,
        last_message_at: lastMsg?.created_at || chat.last_message_at,
      }
    }))

    return NextResponse.json({ data: enrichedChats })
  } catch (err) {
    console.error('GET /api/property-chat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userClient = createAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { propertyId } = body

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
    }

    // Get the property to find the partner
    const { data: property } = await supabase
      .from('property_listings')
      .select('partner_id, title, status')
      .eq('id', propertyId)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (property.status !== 'approved') {
      return NextResponse.json({ error: 'Property is not available' }, { status: 400 })
    }

    if (property.partner_id === user.id) {
      return NextResponse.json({ error: 'Cannot enquire on your own property' }, { status: 400 })
    }

    // Check if chat already exists
    const { data: existingChat } = await supabase
      .from('property_chats')
      .select('id')
      .eq('property_id', propertyId)
      .eq('enquirer_id', user.id)
      .single()

    if (existingChat) {
      return NextResponse.json({ data: existingChat })
    }

    // Create new chat
    const { data: chat, error: chatError } = await supabase
      .from('property_chats')
      .insert({
        property_id: propertyId,
        enquirer_id: user.id,
        partner_id: property.partner_id,
      })
      .select()
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: chatError?.message || 'Failed to create chat' }, { status: 500 })
    }

    // Notify the partner
    const { data: enquirerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    await supabase.from('notifications').insert({
      user_id: property.partner_id,
      type: 'property_enquiry' as const,
      title: 'New Property Enquiry',
      body: `${enquirerProfile?.full_name || 'A member'} is interested in your property "${property.title}".`,
      link: `/dashboard/property-chats?id=${chat.id}`,
      is_read: false,
    })

    return NextResponse.json({ data: chat }, { status: 201 })
  } catch (err) {
    console.error('POST /api/property-chat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
