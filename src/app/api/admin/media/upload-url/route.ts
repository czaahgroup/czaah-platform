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

// No size limit is imposed here. Storage is the single authority: the bucket
// has none, so whatever the project-level "upload file size limit" allows is
// what lands. Re-adding a number here would just be one more place to drift.

// Plenty of pickers — Android gallery apps especially — hand over a File with
// an empty `type`. Rejecting those meant a perfectly good video was refused
// for having no MIME type, which is what stopped the first site-visit clip.
const BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  avif: 'image/avif', gif: 'image/gif',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  pdf: 'application/pdf',
}

function resolveContentType(contentType: unknown, filename: unknown): string | null {
  const given = String(contentType || '').toLowerCase()
  if (ALLOWED.has(given)) return given
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || ''
  const guessed = BY_EXTENSION[ext]
  return guessed && ALLOWED.has(guessed) ? guessed : null
}

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

    const resolvedType = resolveContentType(contentType, filename)
    if (!resolvedType) {
      return NextResponse.json(
        {
          error:
            `${filename || 'That file'} was not accepted` +
            `${contentType ? ` (type "${contentType}")` : ' (the browser reported no file type)'}` +
            '. Use JPG, PNG, WebP, MP4, WebM, MOV or PDF.',
        },
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

    // The browser must PUT with this exact type, or the bucket rejects it.
    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, contentType: resolvedType })
  } catch (err) {
    logError('api.admin.media.uploadUrl', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
