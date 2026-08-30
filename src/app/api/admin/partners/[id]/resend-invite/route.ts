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

async function requireSuperAdmin(request: NextRequest) {
  const userClient = createAuthClient(request)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error
    const supabase = auth.supabase!
    const { id } = await params

    const { data: partner } = await supabase
      .from('partners')
      .select('profile_id, profiles!partners_profile_id_fkey(email)')
      .eq('id', id)
      .single()

    // @ts-expect-error — nested relation shape from Supabase's typed client
    const email: string | undefined = partner?.profiles?.email
    if (!partner || !email) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${new URL(request.url).origin}/api/auth/callback?redirect=${encodeURIComponent('/reset-password')}`,
    })

    if (inviteError) {
      // @ts-expect-error — AuthApiError carries a `code` beyond the base Error type
      if (inviteError.code === 'email_exists' || inviteError.status === 422) {
        return NextResponse.json(
          { error: 'This partner has already confirmed their account and set a password — there’s no invite left to resend. If they’ve forgotten their password, tell them to use "Forgot Password" on the login page.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logError("api.admin.partners.id.resend-invite", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
