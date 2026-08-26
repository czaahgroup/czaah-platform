import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

const REGISTRY_TABLE: Record<string, string> = {
  worker: 'workforce_registry',
  employer: 'employer_registry',
  oep_partner: 'oep_registry',
}

async function purgeStoragePrefix(adminClient: ReturnType<typeof createAdminClient>, bucket: string, prefix: string) {
  const { data: files } = await adminClient.storage.from(bucket).list(prefix)
  if (files && files.length > 0) {
    const paths = files.map(f => `${prefix}/${f.name}`)
    await adminClient.storage.from(bucket).remove(paths)
  }
}

export async function POST(
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

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: target } = await adminClient
      .from('profiles')
      .select('id, email, role, avatar_url')
      .eq('id', id)
      .single()

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (target.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot delete super_admin users' }, { status: 403 })
    }

    const body = await request.json()
    const confirmEmail = (body.confirmEmail || '').trim().toLowerCase()
    if (confirmEmail !== target.email.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Email confirmation does not match this account.' }, { status: 400 })
    }

    // Grab the registry photo path (if any) before it cascades away, so we can clean up storage
    let workerPhotoPath: string | null = null
    const registryTable = REGISTRY_TABLE[target.role]
    if (registryTable === 'workforce_registry') {
      const { data: reg } = await adminClient
        .from('workforce_registry')
        .select('photo_url')
        .eq('profile_id', id)
        .single()
      workerPhotoPath = reg?.photo_url || null
    }

    // Clean up storage — not tied to DB row deletion, so do this regardless of what happens below
    await purgeStoragePrefix(adminClient, 'kyc-documents', id)
    if (workerPhotoPath) {
      await adminClient.storage.from('worker-photos').remove([workerPhotoPath])
    }
    if (target.avatar_url) {
      await adminClient.storage.from('platform-files').remove([target.avatar_url])
    }

    // Try a full removal first — succeeds cleanly for accounts with no linked activity
    // (chat messages sent, KYC reviews performed, audit log entries, etc. all RESTRICT deletion)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id)

    if (!deleteError) {
      return NextResponse.json({ success: true, fullyDeleted: true })
    }

    // Fall back to anonymizing the profile in place — the account is deactivated and
    // stripped of personal data, but the row survives because other tables reference it
    console.error('Full delete failed, falling back to anonymization:', deleteError.message)

    const { error: anonymizeError } = await adminClient
      .from('profiles')
      .update({
        full_name: 'Deleted User',
        email: `deleted-${id}@deleted.czaah.local`,
        phone: null,
        company_name: null,
        company_registration_number: null,
        country: null,
        industry_interests: [],
        company_website: null,
        company_description: null,
        avatar_url: null,
        status: 'deactivated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (anonymizeError) {
      return NextResponse.json({ error: anonymizeError.message }, { status: 500 })
    }

    // Also try to lock the auth account out (can't fully delete it, but disable sign-in)
    await adminClient.auth.admin.updateUserById(id, { password: crypto.randomUUID(), ban_duration: '876000h' })

    return NextResponse.json({
      success: true,
      fullyDeleted: false,
      message: 'This account has linked activity (messages, reviews, audit history) that cannot be safely cascaded, so it was fully anonymized and permanently locked out instead of removed outright.',
    })
  } catch (err) {
    console.error('User purge error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
