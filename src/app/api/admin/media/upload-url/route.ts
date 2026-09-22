import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { STORAGE_BUCKET } from '@/lib/developments'

/**
 * Hands the admin browser a one-shot signed URL so it can PUT a file straight
 * into storage.
 *
 * Media used to travel as base64 inside the JSON save. That inflates a file by
 * a third, has to be buffered whole in the Worker, and made anything but a
 * small image impractical — a site-visit video was rejected at 25MB in the
 * browser and then silently left out of the save. Uploading direct to storage
 * takes the Worker out of the data path entirely, so the only real ceiling is
 * the bucket's own.
 */

const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
])

// Matches the bucket's file_size_limit; checked here too so an oversized file
// is refused before it is sent rather than after.
const MAX_BYTES = 100 * 1024 * 1024

/** Keeps a user-supplied filename from escaping its folder or breaking a URL. */
function safeName(name: string): string {
  const cleaned = (name || 'file')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[-.]+/, '')
    .slice(-80)
  return cleaned || 'file'
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase } = auth

    const { folder, filename, contentType, size } = await request.json()

    if (!contentType || !ALLOWED.has(contentType)) {
      return NextResponse.json(
        { error: `${contentType || 'That file type'} is not accepted. Use JPG, PNG, WebP, MP4, WebM or PDF.` },
        { status: 400 }
      )
    }

    if (typeof size === 'number' && size > MAX_BYTES) {
      return NextResponse.json(
        { error: `That file is ${(size / 1048576).toFixed(0)}MB. The limit is ${MAX_BYTES / 1048576}MB — compress it and try again.` },
        { status: 400 }
      )
    }

    // The folder is ours to decide, never the client's: a caller cannot write
    // outside the media area or traverse out of it.
    const slug = safeName(String(folder || 'new')).toLowerCase()
    const path = `developments/${slug}/${Date.now()}_${safeName(String(filename || 'file'))}`

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(path)

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Could not start the upload' }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path })
  } catch (err) {
    logError('api.admin.media.uploadUrl', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
