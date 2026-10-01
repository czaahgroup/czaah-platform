import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { isMineralSector } from '@/lib/minerals'
import { LISTING_IMAGE_TYPES, LISTING_IMAGE_MAX_BYTES, PARTNER_MAX_PHOTOS, PARTNER_UPLOAD_PREFIX, sniffImageType } from '@/lib/uploadSafety'

/** A sector that lets a partner list property (Admin → Partners → sector access). */
export const isPropertySector = (name: string | null | undefined) => !!name && /real estate|property/i.test(name)

/** Where each kind of account manages its listings. */
export const listingsHome = (role: string | null | undefined) =>
  role === 'partner' ? '/partner-network/properties' : '/dashboard/properties'

/**
 * Who may add and manage property listings:
 *  - a Partner Network partner CZAAH has authorised for Real Estate,
 *  - the older "real estate partner" account type,
 *  - a super admin.
 * Everything a caller then does is still scoped to listings they own.
 */
export async function requireLister(request: NextRequest) {
  return requireSectorPartner(request, isPropertySector, 'Your partner account is not set up for property listings. Ask CZAAH to add Real Estate to your sectors.', true)
}

/**
 * Who may add and manage mineral offers: a partner CZAAH has authorised for
 * Minerals & Mining, or a super admin.
 */
export async function requireMineralPartner(request: NextRequest) {
  return requireSectorPartner(request, isMineralSector, 'Your partner account is not set up for minerals. Ask CZAAH to add Minerals & Mining to your sectors.', false)
}

/** Photo uploads are shared: either kind of partner may use them. */
export async function requireUploader(request: NextRequest) {
  return requireSectorPartner(request, (name) => isPropertySector(name) || isMineralSector(name), 'Your partner account is not set up to upload photos.', true)
}

async function requireSectorPartner(
  request: NextRequest,
  allows: (sectorName: string | null | undefined) => boolean,
  refusal: string,
  /** The older "real estate partner" account type predates sectors and only ever listed property. */
  legacyRealEstateRole: boolean,
) {
  const userClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } }
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as string | undefined

  if (role === 'super_admin' || (legacyRealEstateRole && role === 'real_estate_partner')) return { supabase, userId: user.id, role }

  if (role === 'partner') {
    const { data: partner } = await supabase.from('partners').select('id, status').eq('profile_id', user.id).maybeSingle()
    if (partner && partner.status !== 'suspended') {
      const { data: access } = await supabase.from('partner_sector_access').select('sectors(name)').eq('partner_id', partner.id)
      const allowed = (access || []).some((row) => allows((row as unknown as { sectors: { name: string } | null }).sectors?.name))
      if (allowed) return { supabase, userId: user.id, role }
    }
    return {
      error: NextResponse.json(
        { error: refusal },
        { status: 403 },
      ),
    }
  }
  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
}

/**
 * The photo list for an edit. A path already on the listing is kept as it is;
 * a new one must be in the caller's own upload folder and really be an image
 * within the size limit (the bucket is public, so what landed there is
 * re-checked rather than trusted).
 */
export async function checkedPhotos(
  supabase: SupabaseClient,
  userId: string,
  images: unknown,
  existing: string[],
): Promise<string[]> {
  const out: string[] = []
  if (!Array.isArray(images)) return out
  const prefix = PARTNER_UPLOAD_PREFIX(userId)
  for (const img of images) {
    if (out.length >= PARTNER_MAX_PHOTOS) break
    if (typeof img !== 'string' || !img || out.includes(img)) continue
    if (existing.includes(img)) {
      out.push(img)
      continue
    }
    if (!img.startsWith(prefix) || img.includes('..') || img.slice(prefix.length).includes('/')) {
      logError('lib.partnerListingAuth', new Error('image rejected: foreign path'))
      continue
    }
    const { data: blob, error } = await supabase.storage.from('property-images').download(img)
    const head = blob ? new Uint8Array(await blob.slice(0, 16).arrayBuffer()) : null
    const type = head ? sniffImageType(head) : null
    if (error || !blob || blob.size > LISTING_IMAGE_MAX_BYTES || !type || !LISTING_IMAGE_TYPES[type]) {
      logError('lib.partnerListingAuth', new Error('image rejected: uploaded file failed checks'))
      if (blob) await supabase.storage.from('property-images').remove([img])
      continue
    }
    out.push(img)
  }
  return out
}

/** Tells every super admin that a partner's listing needs a decision. */
export async function notifyAdmins(supabase: SupabaseClient, title: string, body: string, link = '/admin/properties') {
  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'super_admin')
  if (!admins?.length) return
  const { error } = await supabase.from('notifications').insert(
    admins.map((a) => ({ user_id: a.id, type: 'property_submitted', title, body, link, is_read: false })),
  )
  if (error) logError('lib.partnerListingAuth', error, { step: 'notify-admins' })
}
