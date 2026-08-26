import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    // Create server client from request cookies to verify caller
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify super_admin role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all enquiries that have chat messages
    // First get distinct enquiry_ids from chat_messages
    const { data: messageStats, error: statsError } = await adminClient
      .from('chat_messages')
      .select('enquiry_id')

    if (statsError) {
      console.error('Chat messages fetch error:', statsError)
      return NextResponse.json({ error: statsError.message }, { status: 500 })
    }

    // Get unique enquiry IDs that have messages
    const enquiryIds = [...new Set((messageStats || []).map((m: { enquiry_id: string }) => m.enquiry_id))]

    if (enquiryIds.length === 0) {
      return NextResponse.json({ data: [], currentUserId: user.id })
    }

    // Fetch those enquiries with member profiles
    const { data: enquiries, error: enqError } = await adminClient
      .from('enquiries')
      .select(`
        id, reference_number, status, assigned_admin_id, member_id,
        profiles!member_id (full_name, company_name)
      `)
      .in('id', enquiryIds)

    if (enqError) {
      console.error('Enquiries fetch error:', enqError)
      return NextResponse.json({ error: enqError.message }, { status: 500 })
    }

    // For each enquiry, get message count, last message, and admin name
    const chatList = []

    for (const enq of (enquiries || [])) {
      // Message count
      const { count } = await adminClient
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('enquiry_id', enq.id)

      // Last message (non-internal)
      const { data: lastMsgs } = await adminClient
        .from('chat_messages')
        .select('content, created_at')
        .eq('enquiry_id', enq.id)
        .eq('is_internal_note', false)
        .order('created_at', { ascending: false })
        .limit(1)

      // Admin name
      let adminName: string | null = null
      if (enq.assigned_admin_id) {
        const { data: adminProfile } = await adminClient
          .from('profiles')
          .select('full_name')
          .eq('id', enq.assigned_admin_id)
          .single()
        adminName = adminProfile?.full_name || null
      }

      const profileRaw = enq.profiles as unknown
      const profileData = Array.isArray(profileRaw) ? profileRaw[0] as { full_name: string; company_name: string | null } | undefined : profileRaw as { full_name: string; company_name: string | null } | null

      chatList.push({
        id: enq.id,
        reference_number: enq.reference_number,
        status: enq.status,
        assigned_admin_id: enq.assigned_admin_id,
        member_id: enq.member_id,
        member_name: profileData?.full_name || 'Unknown',
        member_company: profileData?.company_name || null,
        admin_name: adminName,
        last_message: lastMsgs?.[0]?.content || null,
        last_message_at: lastMsgs?.[0]?.created_at || null,
        message_count: count || 0,
      })
    }

    // Sort by last message time (most recent first)
    chatList.sort((a, b) => {
      if (!a.last_message_at && !b.last_message_at) return 0
      if (!a.last_message_at) return 1
      if (!b.last_message_at) return -1
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    })

    return NextResponse.json({ data: chatList, currentUserId: user.id })
  } catch (err) {
    console.error('Admin chats API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
