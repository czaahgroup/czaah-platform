import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

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

// Same as /api/admin/partners/[id]/set-password, but for any profile
// directly by id — partners have their own row in `partners` keyed by
// profile_id, everyone else (members, elite_member, etc.) doesn't.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userClient = createAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()
    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!callerProfile || callerProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const { data: target } = await supabase.from('profiles').select('role').eq('id', id).single()
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (target.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot change super_admin passwords from here' }, { status: 403 })
    }

    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(id, { password })
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'user_password_set',
      target_type: 'profile',
      target_id: id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/admin/users/[id]/set-password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
