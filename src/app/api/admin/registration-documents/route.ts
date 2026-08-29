import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'


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

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const path = request.nextUrl.searchParams.get('path')
    if (!path) {
      return NextResponse.json({ error: 'path required' }, { status: 400 })
    }

    // Generate a signed URL (valid for 1 hour)
    const { data, error } = await adminClient.storage
      .from('registration-documents')
      .createSignedUrl(path, 3600)

    if (error) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    console.error('Registration document API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
