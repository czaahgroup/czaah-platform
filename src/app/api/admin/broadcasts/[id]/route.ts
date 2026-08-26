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
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: broadcastId } = await params
    const supabase = createAdminClient()

    // Get broadcast
    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .single()

    if (error || !broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Verify access
    if (profile?.role !== 'super_admin' && profile?.role !== 'admin' && !broadcast.target_roles.includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get read receipts
    const { data: reads } = await supabase
      .from('broadcast_reads')
      .select('user_id, read_at')
      .eq('broadcast_id', broadcastId)

    // Get reader profiles
    const readerIds = (reads || []).map((r) => r.user_id)
    let readers: { id: string; full_name: string; role: string; read_at: string }[] = []

    if (readerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', readerIds)

      readers = (profiles || []).map((p) => {
        const readInfo = reads!.find((r) => r.user_id === p.id)
        return {
          ...p,
          read_at: readInfo?.read_at || '',
        }
      })
    }

    // Get sender name
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', broadcast.sent_by)
      .single()

    // Get total targeted count
    const { count: totalTargeted } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', broadcast.target_roles)
      .eq('status', 'approved')

    return NextResponse.json({
      data: {
        broadcast: {
          ...broadcast,
          sender_name: sender?.full_name || 'Unknown',
        },
        read_count: reads?.length || 0,
        total_targeted: totalTargeted || 0,
        readers,
      },
    })
  } catch (err) {
    console.error('GET /api/admin/broadcasts/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: broadcastId } = await params
    const supabase = createAdminClient()

    // Mark as read — upsert to handle duplicates
    const { error } = await supabase
      .from('broadcast_reads')
      .upsert(
        {
          broadcast_id: broadcastId,
          user_id: user.id,
        },
        { onConflict: 'broadcast_id,user_id' }
      )

    if (error) {
      console.error('Failed to mark broadcast as read:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('POST /api/admin/broadcasts/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
