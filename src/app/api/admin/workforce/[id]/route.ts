import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


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

      const validStatuses = ['registered', 'shortlisted', 'placed', 'inactive']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      // Gate progression on identity verification
      if (body.status === 'shortlisted' || body.status === 'placed') {
        const { data: existing } = await adminClient
          .from('workforce_registry')
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
              { error: 'Cannot approve — this candidate\'s account has not passed KYC review yet.' },
              { status: 400 }
            )
          }
        } else if (!existing?.identity_document_url) {
          // Legacy row with no linked account — preserve the old document check
          return NextResponse.json(
            { error: 'Cannot approve — no identity document on file for this candidate.' },
            { status: 400 }
          )
        }
      }

      updates.status = body.status
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes
    }

    if (body.photo && typeof body.photo === 'string') {
      const match = body.photo.match(/^data:([^;]+);base64,(.+)$/)
      const contentType = match ? match[1] : 'image/jpeg'
      const base64Data = match ? match[2] : body.photo
      if (contentType.startsWith('image/')) {
        const buffer = Buffer.from(base64Data, 'base64')
        const ext = contentType.split('/')[1] || 'jpg'
        const filePath = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: uploadError } = await adminClient.storage
          .from('worker-photos')
          .upload(filePath, buffer, { contentType, upsert: false })
        if (!uploadError) {
          updates.photo_url = filePath
        } else {
          console.error('Failed to upload worker photo:', uploadError.message)
        }
      }
    }

    const { data, error } = await adminClient
      .from('workforce_registry')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logError("api.admin.workforce.id", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    logError("api.admin.workforce.id", err)
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
      .from('workforce_registry')
      .select('profile_id, identity_document_url, photo_url')
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
    if (existing.photo_url) {
      await adminClient.storage.from('worker-photos').remove([existing.photo_url])
    }

    const { error } = await adminClient.from('workforce_registry').delete().eq('id', id)

    if (error) {
      logError("api.admin.workforce.id", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logError("api.admin.workforce.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
