import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'


function createAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
}

// Serves a short-lived signed URL for a partner opportunity document —
// only to the partner who owns the opportunity, or to super_admin.
// Unlike /api/files (KYC docs), this checks real ownership of the
// specific document, not just "is the caller authenticated."
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userClient = createAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { data: doc } = await supabase
      .from('partner_opportunity_documents')
      .select('file_path, opportunity_id, partner_opportunities(partner_id, partners(profile_id))')
      .eq('id', id)
      .single()

    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const isSuperAdmin = profile.role === 'super_admin'
    // @ts-expect-error — nested relation shape from Supabase's typed client
    const ownerProfileId = doc.partner_opportunities?.partners?.profile_id
    const isOwner = profile.role === 'partner' && ownerProfileId === user.id

    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('partner-documents')
      .createSignedUrl(doc.file_path, 3600)

    if (signError || !signed) {
      return NextResponse.json({ error: signError?.message || 'Failed to sign URL' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err) {
    console.error('GET /api/partner/documents/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
