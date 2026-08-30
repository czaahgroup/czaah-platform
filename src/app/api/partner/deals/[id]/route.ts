import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


function getAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } }
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getAuthClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'investment_partner' && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch the deal — only if submitted by this user
    const { data: deal, error } = await adminClient
      .from('investment_opportunities')
      .select('*')
      .eq('id', id)
      .eq('submitted_by', user.id)
      .single()

    if (error || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Fetch documents for this deal
    const { data: documents } = await adminClient
      .from('investment_documents')
      .select('id, document_type, file_url, file_name, uploaded_at')
      .eq('investment_id', id)
      .order('uploaded_at', { ascending: false })

    return NextResponse.json({ deal, documents: documents || [] })
  } catch (err) {
    logError("api.partner.deals.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getAuthClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'investment_partner' && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify deal belongs to user and is still pending
    const { data: deal } = await adminClient
      .from('investment_opportunities')
      .select('id, approval_status, submitted_by')
      .eq('id', id)
      .eq('submitted_by', user.id)
      .single()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    if (deal.approval_status !== 'pending_approval') {
      return NextResponse.json({ error: 'Can only edit deals with pending approval status' }, { status: 400 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.title !== undefined) updates.title = body.title
    if (body.sector_tag !== undefined) updates.sector_tag = body.sector_tag || null
    if (body.description !== undefined) updates.description = body.description || null
    if (body.min_investment_amount !== undefined) {
      updates.min_investment_amount = body.min_investment_amount ? parseFloat(body.min_investment_amount) : null
    }
    if (body.currency !== undefined) updates.currency = body.currency
    if (body.target_return !== undefined) updates.target_return = body.target_return || null
    if (body.investment_timeline !== undefined) updates.investment_timeline = body.investment_timeline || null
    if (body.location !== undefined) updates.location = body.location || null
    if (body.key_highlights !== undefined) updates.key_highlights = body.key_highlights || []

    updates.updated_at = new Date().toISOString()

    const { error } = await adminClient
      .from('investment_opportunities')
      .update(updates)
      .eq('id', id)

    if (error) {
      logError("api.partner.deals.id", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logError("api.partner.deals.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getAuthClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'investment_partner' && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify deal belongs to user and is pending
    const { data: deal } = await adminClient
      .from('investment_opportunities')
      .select('id, approval_status, submitted_by')
      .eq('id', id)
      .eq('submitted_by', user.id)
      .single()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    if (deal.approval_status !== 'pending_approval') {
      return NextResponse.json({ error: 'Can only delete deals with pending approval status' }, { status: 400 })
    }

    // Delete documents first
    await adminClient
      .from('investment_documents')
      .delete()
      .eq('investment_id', id)

    // Delete the deal
    const { error } = await adminClient
      .from('investment_opportunities')
      .delete()
      .eq('id', id)

    if (error) {
      logError("api.partner.deals.id", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logError("api.partner.deals.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
