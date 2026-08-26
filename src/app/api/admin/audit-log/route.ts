import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
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
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10)
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)
    const action = request.nextUrl.searchParams.get('action')
    const targetType = request.nextUrl.searchParams.get('target_type')
    const dateFrom = request.nextUrl.searchParams.get('date_from')
    const dateTo = request.nextUrl.searchParams.get('date_to')

    const offset = (page - 1) * limit

    // Build query
    let query = adminClient
      .from('audit_log')
      .select('id, actor_id, action, target_type, target_id, metadata, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action) {
      query = query.eq('action', action)
    }
    if (targetType) {
      query = query.eq('target_type', targetType)
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
    }

    const { data: entries, count, error } = await query

    if (error) {
      console.error('Audit log fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get actor names
    const actorIds = [...new Set((entries || []).map((e) => e.actor_id).filter(Boolean))]
    let actorMap: Record<string, string> = {}

    if (actorIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name')
        .in('id', actorIds)

      if (profiles) {
        actorMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name || 'Unknown']))
      }
    }

    // Merge actor names into entries
    const enrichedEntries = (entries || []).map((entry) => ({
      ...entry,
      actor_name: entry.actor_id ? (actorMap[entry.actor_id] || 'Unknown') : 'System',
    }))

    return NextResponse.json({
      data: enrichedEntries,
      total: count || 0,
    })
  } catch (err) {
    console.error('Audit log API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
