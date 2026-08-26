import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 10 per hour per user
    const { success: rateLimitOk } = rateLimit(`avatar:${user.id}`, 10, 3600000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { imageData } = body

    if (!imageData) {
      return NextResponse.json({ error: 'imageData is required' }, { status: 400 })
    }

    // Check file size (5MB max for avatars)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (Buffer.from(imageData, 'base64').length > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 413 })
    }

    const supabase = createAdminClient()
    const buffer = Buffer.from(imageData, 'base64')
    const filePath = `avatars/${user.id}/${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('platform-files')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Update profile avatar_url
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: filePath })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: { avatar_url: filePath } })
  } catch (err) {
    console.error('POST /api/profile/avatar error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
