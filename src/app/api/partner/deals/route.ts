import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

function getAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getAuthClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify investment_partner or super_admin role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'investment_partner' && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return deals submitted by this user, ordered by created_at desc
    const { data, error } = await adminClient
      .from('investment_opportunities')
      .select('id, title, sector_tag, description, min_investment_amount, currency, target_return, investment_timeline, location, key_highlights, status, approval_status, approval_notes, created_at, updated_at')
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Partner deals fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('Partner deals API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAuthClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify investment_partner or super_admin role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'investment_partner' && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      sector_tag,
      description,
      min_investment_amount,
      currency,
      target_return,
      investment_timeline,
      location,
      key_highlights,
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('investment_opportunities')
      .insert({
        title: title.trim(),
        sector_tag: sector_tag || null,
        description: description || null,
        min_investment_amount: min_investment_amount ? parseFloat(min_investment_amount) : null,
        currency: currency || 'USD',
        target_return: target_return || null,
        investment_timeline: investment_timeline || null,
        location: location || null,
        key_highlights: key_highlights || [],
        submitted_by: user.id,
        created_by: user.id,
        status: 'draft',
        approval_status: 'pending_approval',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Partner deal create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Partner deals POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
