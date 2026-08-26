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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sectorId = searchParams.get('sector_id')
    const partnerId = searchParams.get('partner_id')

    let query = auth.supabase!
      .from('partner_opportunities')
      .select('*, sectors(id, name), partners(id, partner_id, profiles!partners_profile_id_fkey(full_name, email)), partner_opportunity_documents(id, file_path, file_name)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (sectorId) query = query.eq('sector_id', sectorId)
    if (partnerId) query = query.eq('partner_id', partnerId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/admin/partner-opportunities error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
