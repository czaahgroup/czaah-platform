import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'


export async function GET(request: NextRequest) {
  try {
    // Verify authenticated user
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

    // Rate limit: 60 per minute per user
    const { success: rateLimitOk } = rateLimit(`files:${user.id}`, 60, 60000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const path = request.nextUrl.searchParams.get('path')
    const bucket = request.nextUrl.searchParams.get('bucket') || 'platform-files'

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(path, 3600)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    logError("api.files", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
