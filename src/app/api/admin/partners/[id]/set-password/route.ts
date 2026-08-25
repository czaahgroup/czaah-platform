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

async function requireSuperAdmin(request: NextRequest) {
  const userClient = createAuthClient(request)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase, userId: user.id }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error
    const supabase = auth.supabase!
    const { id } = await params

    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('profile_id')
      .eq('id', id)
      .single()

    if (!partner?.profile_id) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(partner.profile_id, { password })
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabase.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'partner_password_set',
      target_type: 'partner',
      target_id: id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/admin/partners/[id]/set-password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
