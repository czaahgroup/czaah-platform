import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify admin role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.status) {
      // Only super admins can change pipeline status
      if (profile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Only super admins can change status' }, { status: 403 })
      }

      const validStatuses = ['registered', 'contacted', 'active_client', 'inactive']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      // Gate progression on identity verification
      if (body.status === 'active_client') {
        const { data: existing } = await adminClient
          .from('employer_registry')
          .select('profile_id, identity_document_url')
          .eq('id', id)
          .single()

        if (existing?.profile_id) {
          // Linked account — verification happens through the unified KYC queue
          const { data: linkedProfile } = await adminClient
            .from('profiles')
            .select('status')
            .eq('id', existing.profile_id)
            .single()

          if (linkedProfile?.status !== 'approved') {
            return NextResponse.json(
              { error: 'Cannot approve — this employer\'s account has not passed KYC review yet.' },
              { status: 400 }
            )
          }
        } else if (!existing?.identity_document_url) {
          // Legacy row with no linked account — preserve the old document check
          return NextResponse.json(
            { error: 'Cannot approve — no identity document on file for this employer.' },
            { status: 400 }
          )
        }
      }

      updates.status = body.status
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes
    }

    const { data, error } = await adminClient
      .from('employer_registry')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Employer update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/admin/employers/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Deletes a legacy registry row that has no linked login account. For accounts
// with a profile_id, use /api/admin/users/[id]/purge instead — deleting the
// registry row alone would leave a login account with no registration data.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

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

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can delete records' }, { status: 403 })
    }

    const { data: existing } = await adminClient
      .from('employer_registry')
      .select('profile_id, identity_document_url')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (existing.profile_id) {
      return NextResponse.json(
        { error: 'This record is linked to a login account — delete the account instead to remove it.' },
        { status: 400 }
      )
    }

    if (existing.identity_document_url) {
      await adminClient.storage.from('registration-documents').remove([existing.identity_document_url])
    }

    const { error } = await adminClient.from('employer_registry').delete().eq('id', id)

    if (error) {
      console.error('Employer delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/employers/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
