import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { STORAGE_BUCKET } from '@/lib/developments'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Everything in the property media bucket, with what each file is used by.
 *
 * There was no way to see what had been uploaded — not how many videos, not
 * how much space, and certainly not which files nothing pointed at any more.
 * Orphans matter here because removing a picture in the editor clears the
 * database pointer but, for the single-file fields, leaves the object behind.
 */

interface MediaFile {
  path: string
  name: string
  size: number
  mimetype: string | null
  createdAt: string | null
  kind: 'video' | 'image' | 'document' | 'other'
  usedBy: string | null
  url: string
}

function classify(mimetype: string | null, path: string): MediaFile['kind'] {
  const type = mimetype || ''
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('image/')) return 'image'
  if (type === 'application/pdf') return 'document'
  // Fall back to the extension — older objects can have no recorded mimetype.
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return 'video'
  if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'document'
  return 'other'
}

/** Walks the bucket. Storage lists one folder at a time, so recurse. */
async function walk(supabase: SupabaseClient, prefix: string, depth = 0): Promise<MediaFile[]> {
  if (depth > 4) return []
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(prefix, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })

  if (error || !data) return []

  const out: MediaFile[] = []
  for (const entry of data) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    // A folder comes back with no id and no metadata.
    if (!entry.id) {
      out.push(...(await walk(supabase, path, depth + 1)))
      continue
    }
    const mimetype = (entry.metadata?.mimetype as string) ?? null
    out.push({
      path,
      name: entry.name,
      size: Number(entry.metadata?.size ?? 0),
      mimetype,
      createdAt: entry.created_at ?? null,
      kind: classify(mimetype, path),
      usedBy: null,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`,
    })
  }
  return out
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase } = auth

    const files = await walk(supabase, '')

    // Everything the database currently points at, so the rest are orphans.
    const used = new Map<string, string>()
    const claim = (path: unknown, owner: string) => {
      if (typeof path === 'string' && path && !path.startsWith('http')) used.set(path, owner)
    }

    const { data: developments } = await supabase
      .from('developments')
      .select('name, featured_image, gallery, video_url, video_poster_url, brochure_url')

    for (const d of developments || []) {
      claim(d.featured_image, `${d.name} — main image`)
      claim(d.video_url, `${d.name} — video`)
      claim(d.video_poster_url, `${d.name} — video poster`)
      claim(d.brochure_url, `${d.name} — brochure`)
      for (const g of d.gallery || []) claim(g, `${d.name} — gallery`)
    }

    const { data: listings } = await supabase
      .from('property_listings')
      .select('title, images, video_url, video_poster_url')

    for (const l of listings || []) {
      claim(l.video_url, `${l.title} — video`)
      claim(l.video_poster_url, `${l.title} — video poster`)
      for (const i of l.images || []) claim(i, `${l.title} — image`)
    }

    for (const file of files) file.usedBy = used.get(file.path) ?? null

    const summary = {
      total: files.length,
      totalBytes: files.reduce((sum, f) => sum + f.size, 0),
      videos: files.filter((f) => f.kind === 'video').length,
      videoBytes: files.filter((f) => f.kind === 'video').reduce((s, f) => s + f.size, 0),
      images: files.filter((f) => f.kind === 'image').length,
      documents: files.filter((f) => f.kind === 'document').length,
      orphans: files.filter((f) => !f.usedBy).length,
      orphanBytes: files.filter((f) => !f.usedBy).reduce((s, f) => s + f.size, 0),
    }

    return NextResponse.json({ data: files, summary })
  } catch (err) {
    logError('api.admin.media', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Deletes files from the bucket. Refuses anything still referenced. */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase } = auth

    const { paths } = await request.json()
    if (!Array.isArray(paths) || !paths.length) {
      return NextResponse.json({ error: 'No files given' }, { status: 400 })
    }

    // Re-check usage server-side: the page's view could be stale, and deleting
    // a file a published page points at would leave a broken image.
    const inUse = new Set<string>()
    const { data: developments } = await supabase
      .from('developments')
      .select('featured_image, gallery, video_url, video_poster_url, brochure_url')
    for (const d of developments || []) {
      for (const p of [d.featured_image, d.video_url, d.video_poster_url, d.brochure_url, ...(d.gallery || [])]) {
        if (p) inUse.add(p)
      }
    }
    const { data: listings } = await supabase
      .from('property_listings')
      .select('images, video_url, video_poster_url')
    for (const l of listings || []) {
      for (const p of [l.video_url, l.video_poster_url, ...(l.images || [])]) if (p) inUse.add(p)
    }

    const refused = paths.filter((p: string) => inUse.has(p))
    const removable = paths.filter((p: string) => !inUse.has(p))

    if (removable.length) {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(removable)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ deleted: removable.length, refused })
  } catch (err) {
    logError('api.admin.media', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
