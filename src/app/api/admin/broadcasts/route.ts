import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


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

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let broadcasts

    if (profile.role === 'super_admin') {
      // Super admin sees all broadcasts
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('sent_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      broadcasts = data || []
    } else {
      // Others see broadcasts targeting their role
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .contains('target_roles', [profile.role])
        .order('sent_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      broadcasts = data || []
    }

    // Get read status for each broadcast
    const broadcastDetails = await Promise.all(
      broadcasts.map(async (broadcast) => {
        // Get read count
        const { count: readCount } = await supabase
          .from('broadcast_reads')
          .select('id', { count: 'exact', head: true })
          .eq('broadcast_id', broadcast.id)

        // Check if current user has read
        const { data: userRead } = await supabase
          .from('broadcast_reads')
          .select('id')
          .eq('broadcast_id', broadcast.id)
          .eq('user_id', user.id)
          .single()

        // Get total targeted users count (for super_admin view)
        let totalTargeted = 0
        if (profile.role === 'super_admin') {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .in('role', broadcast.target_roles)
            .eq('status', 'approved')

          totalTargeted = count || 0
        }

        // Get sender name
        const { data: sender } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', broadcast.sent_by)
          .single()

        return {
          ...broadcast,
          read_count: readCount || 0,
          total_targeted: totalTargeted,
          is_read: !!userRead,
          sender_name: sender?.full_name || 'Unknown',
        }
      })
    )

    return NextResponse.json({ data: broadcastDetails })
  } catch (err) {
    logError("api.admin.broadcasts", err)
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

    // Verify super_admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can send broadcasts' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, targetRoles } = body

    if (!title || !content || !targetRoles || !Array.isArray(targetRoles) || targetRoles.length === 0) {
      return NextResponse.json({ error: 'title, content, and targetRoles required' }, { status: 400 })
    }

    // Create broadcast
    const { data: broadcast, error: bcError } = await supabase
      .from('broadcasts')
      .insert({
        title,
        content,
        sent_by: user.id,
        target_roles: targetRoles,
      })
      .select()
      .single()

    if (bcError) {
      logError('api.admin.broadcasts', bcError, { step: 'create-broadcast' })
      return NextResponse.json({ error: bcError.message }, { status: 500 })
    }

    // Create notifications for targeted users
    const { data: targetedUsers } = await supabase
      .from('profiles')
      .select('id')
      .in('role', targetRoles)
      .eq('status', 'approved')
      .neq('id', user.id)

    if (targetedUsers && targetedUsers.length > 0) {
      const notifications = targetedUsers.map((u) => ({
        user_id: u.id,
        type: 'broadcast' as const,
        title: `Broadcast: ${title}`,
        body: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
        link: `/dashboard/broadcasts`,
        is_read: false,
      }))

      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json({ data: broadcast })
  } catch (err) {
    logError("api.admin.broadcasts", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
