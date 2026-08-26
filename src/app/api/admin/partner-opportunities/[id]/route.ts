import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'

const VALID_STATUSES = [
  'draft', 'submitted', 'more_info_required', 'approved',
  'in_progress', 'completed', 'rejected', 'archived',
]
const VALID_VISIBILITY = ['private', 'selective', 'published']

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error
    const { id } = await params
    const supabase = auth.supabase!

    const body = await request.json()
    const { status, visibility_scope, admin_notes, commission_notes } = body

    const updates: Record<string, unknown> = {}
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      updates.status = status
      updates.reviewed_by = auth.userId
      updates.reviewed_at = new Date().toISOString()
    }
    if (visibility_scope !== undefined) {
      if (!VALID_VISIBILITY.includes(visibility_scope)) return NextResponse.json({ error: 'Invalid visibility_scope' }, { status: 400 })
      updates.visibility_scope = visibility_scope
    }
    if (admin_notes !== undefined) updates.admin_notes = admin_notes
    if (commission_notes !== undefined) updates.commission_notes = commission_notes

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }
    updates.updated_at = new Date().toISOString()

    const { error } = await supabase.from('partner_opportunities').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (status !== undefined) {
      await supabase.from('audit_log').insert({
        actor_id: auth.userId,
        action: 'partner_opportunity_status_changed',
        target_type: 'partner_opportunity',
        target_id: id,
        metadata: { status },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/admin/partner-opportunities/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
