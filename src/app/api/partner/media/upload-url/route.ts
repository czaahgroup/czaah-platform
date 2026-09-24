import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'
import { LISTING_IMAGE_TYPES, LISTING_IMAGE_MAX_BYTES, PARTNER_UPLOAD_PREFIX, safeFileName } from '@/lib/uploadSafety'

/**
 * Signed upload URL for a partner's listing photo.
 *
 * Partner photos used to travel as base64 inside the create request, which
 * capped a listing at a handful of small images. Now the browser PUTs each
 * photo straight into storage, into the partner's own staging folder, and the
 * create route re-checks every file (owner prefix, real image bytes, size)
 * before it is attached to a listing.
 */

const BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif',
}

export async function POST(request: NextRequest) {
  try {
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'real_estate_partner' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { success } = rateLimit(`partner-photo-upload:${user.id}`, 120, 3600000)
    if (!success) return NextResponse.json({ error: 'Too many uploads — try again in an hour.' }, { status: 429 })

    const { filename, contentType, size } = await request.json()

    const given = String(contentType || '').toLowerCase()
    const ext = String(filename || '').split('.').pop()?.toLowerCase() || ''
    const type = LISTING_IMAGE_TYPES[given] ? given : BY_EXTENSION[ext]
    if (!type || !LISTING_IMAGE_TYPES[type]) {
      return NextResponse.json({ error: `${filename || 'That file'} is not a JPG, PNG, WebP or AVIF photo.` }, { status: 400 })
    }
    if (Number(size) > LISTING_IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: `${filename || 'That photo'} is over 10MB.` }, { status: 400 })
    }

    const name = safeFileName(filename, 'photo').replace(/[^a-zA-Z0-9._-]+/g, '-')
    const path = `${PARTNER_UPLOAD_PREFIX(user.id)}${Date.now()}_${name}`

    const { data, error } = await supabase.storage.from('property-images').createSignedUploadUrl(path)
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Could not start the upload' }, { status: 500 })
    }
    return NextResponse.json({ signedUrl: data.signedUrl, path, contentType: type })
  } catch (err) {
    logError('api.partner.media.uploadUrl', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
