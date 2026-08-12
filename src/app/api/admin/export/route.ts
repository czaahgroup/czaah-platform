import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.map(escapeCSV).join(',')
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCSV(row[h])).join(',')
  )
  return [headerLine, ...dataLines].join('\r\n')
}

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

    const type = request.nextUrl.searchParams.get('type')
    let csv = ''
    let filename = 'export.csv'

    switch (type) {
      case 'members': {
        const { data, error } = await adminClient
          .from('profiles')
          .select('id, full_name, email, company_name, role, status, phone, country, industry_interests, company_website, company_registration_number, created_at, updated_at')
          .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)

        const headers = ['id', 'full_name', 'email', 'company_name', 'role', 'status', 'phone', 'country', 'industry_interests', 'company_website', 'company_registration_number', 'created_at', 'updated_at']
        csv = toCSV(headers, data || [])
        filename = `members_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'enquiries': {
        const { data, error } = await adminClient
          .from('enquiries')
          .select('id, reference_number, member_id, product_name, sector_id, description, status, assigned_admin_id, assigned_at, created_at, updated_at')
          .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)

        const headers = ['id', 'reference_number', 'member_id', 'product_name', 'sector_id', 'description', 'status', 'assigned_admin_id', 'assigned_at', 'created_at', 'updated_at']
        csv = toCSV(headers, data || [])
        filename = `enquiries_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'investments': {
        const { data, error } = await adminClient
          .from('investment_opportunities')
          .select('id, title, sector_tag, status, min_investment_amount, currency, target_return, investment_timeline, description, location, key_highlights, published_at, created_at, updated_at')
          .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)

        const headers = ['id', 'title', 'sector_tag', 'status', 'min_investment_amount', 'currency', 'target_return', 'investment_timeline', 'description', 'location', 'key_highlights', 'published_at', 'created_at', 'updated_at']
        csv = toCSV(headers, data || [])
        filename = `investments_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'audit-log': {
        const { data, error } = await adminClient
          .from('audit_log')
          .select('id, actor_id, action, target_type, target_id, metadata, created_at')
          .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)

        // Enrich with actor names
        const actorIds = [...new Set((data || []).map((e) => e.actor_id).filter(Boolean))]
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

        const enriched = (data || []).map((entry) => ({
          ...entry,
          actor_name: entry.actor_id ? (actorMap[entry.actor_id] || 'Unknown') : 'System',
        }))

        const headers = ['id', 'actor_id', 'actor_name', 'action', 'target_type', 'target_id', 'metadata', 'created_at']
        csv = toCSV(headers, enriched)
        filename = `audit_log_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid export type. Supported: members, enquiries, investments, audit-log' }, { status: 400 })
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('Export API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
