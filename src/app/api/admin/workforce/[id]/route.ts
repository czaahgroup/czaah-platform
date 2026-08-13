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
      const validStatuses = ['registered', 'shortlisted', 'placed', 'inactive']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
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
      console.error('Workforce update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/admin/workforce/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
