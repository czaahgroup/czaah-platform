import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    // Auth check using request cookies
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

    const path = request.nextUrl.searchParams.get('path')
    if (!path) {
      return NextResponse.json({ error: 'path parameter required' }, { status: 400 })
    }

    // Verify the document belongs to this user by checking kyc_documents table
    const adminClient = createAdminClient()

    const { data: doc } = await adminClient
      .from('kyc_documents')
      .select('id')
      .eq('user_id', user.id)
      .eq('file_url', path)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Generate a signed URL (valid for 1 hour)
    const { data, error } = await adminClient.storage
      .from('kyc-documents')
      .createSignedUrl(path, 3600)

    if (error) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    console.error('Member document API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
