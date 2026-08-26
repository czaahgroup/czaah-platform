import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

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

    const { id: groupId } = await params
    const supabase = createAdminClient()

    // Verify caller is member of group
    const { data: membership } = await supabase
      .from('group_chat_members')
      .select('id')
      .eq('chat_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { userId: newUserId } = body

    if (!newUserId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Add member
    const { data: member, error } = await supabase
      .from('group_chat_members')
      .insert({
        chat_id: groupId,
        user_id: newUserId,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: member })
  } catch (err) {
    console.error('POST /api/admin/groups/[id]/members error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params
    const supabase = createAdminClient()

    const url = new URL(request.url)
    const targetUserId = url.searchParams.get('userId')

    if (!targetUserId) {
      return NextResponse.json({ error: 'userId query param required' }, { status: 400 })
    }

    // Check permissions: can remove self, or if creator/super_admin
    if (targetUserId !== user.id) {
      const { data: group } = await supabase
        .from('group_chats')
        .select('created_by')
        .eq('id', groupId)
        .single()

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (group?.created_by !== user.id && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from('group_chat_members')
      .delete()
      .eq('chat_id', groupId)
      .eq('user_id', targetUserId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('DELETE /api/admin/groups/[id]/members error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
