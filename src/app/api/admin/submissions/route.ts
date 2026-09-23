import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { logActivity } from '@/lib/activity'
import { SUBMISSION_STATUSES, SUBMISSION_PROPERTY_TYPES, toSqft } from '@/lib/propertySubmissions'

/**
 * Admin → Submissions: review what owners, developers and partners sent from
 * /sell. Photos are private; the list hands out short-lived signed URLs.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let q = auth.supabase.from('property_submissions').select('*').order('created_at', { ascending: false }).limit(200)
    if (status && (SUBMISSION_STATUSES as readonly string[]).includes(status)) q = q.eq('status', status)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data || []
    const paths = rows.flatMap((r) => r.images || [])
    const signed: Record<string, string> = {}
    if (paths.length) {
      const { data: urls } = await auth.supabase.storage.from('platform-files').createSignedUrls(paths, 3600)
      for (const u of urls || []) if (u.path && u.signedUrl) signed[u.path] = u.signedUrl
    }
    return NextResponse.json({
      data: rows.map((r) => ({ ...r, image_urls: (r.images || []).map((p: string) => signed[p]).filter(Boolean) })),
    })
  } catch (err) {
    logError('api.admin.submissions', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Status and notes. Converting has its own action (POST). */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { id, status, admin_notes } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const update: Record<string, unknown> = { reviewed_by: auth.userId, reviewed_at: new Date().toISOString() }
    if (status !== undefined) {
      if (!(SUBMISSION_STATUSES as readonly string[]).includes(status) || status === 'converted') {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      update.status = status
    }
    if (admin_notes !== undefined) update.admin_notes = String(admin_notes || '').slice(0, 5000) || null

    const { error } = await auth.supabase.from('property_submissions').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await logActivity({ actorId: auth.userId, action: 'submission.updated', targetId: id, metadata: { status } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.submissions', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Convert a sell / let submission into a listing. The listing is created as
 * PENDING, so it still goes through the normal approval in Admin →
 * Properties — the owner's figures are checked before anything is public.
 * Photos are copied from the private bucket into the public listing bucket.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data: s } = await auth.supabase.from('property_submissions').select('*').eq('id', id).maybeSingle()
    if (!s) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    if (s.listing_id) return NextResponse.json({ error: 'Already converted.', listing_id: s.listing_id }, { status: 409 })
    if (s.kind !== 'sell' && s.kind !== 'let') {
      return NextResponse.json({ error: 'Only sell and let submissions become listings. Add developments in Admin → Developments.' }, { status: 400 })
    }

    const t = SUBMISSION_PROPERTY_TYPES.find((x) => x.v === s.property_type) || SUBMISSION_PROPERTY_TYPES[SUBMISSION_PROPERTY_TYPES.length - 1]
    const isPlot = t.assetClass === 'land'
    const place = s.city || s.country || 'location to confirm'
    const beds = s.bedrooms ? `${s.bedrooms}-bed ` : ''
    const title = `${beds}${t.l.split(' /')[0]} ${s.kind === 'let' ? 'to rent' : 'for sale'} in ${place}`

    const listing: Record<string, unknown> = {
      partner_id: null, // CZAAH-direct, like listings created in admin
      title: title.charAt(0).toUpperCase() + title.slice(1),
      property_type: t.assetClass,
      property_subtype: t.subtype,
      listing_type: s.kind === 'let' ? 'rent' : 'sale',
      price: s.kind === 'let' ? s.expected_rent : s.expected_price,
      currency: s.currency || 'PKR',
      rent_period: s.kind === 'let' ? s.rent_period || 'month' : null,
      location: s.address || s.city || 'To confirm',
      city: s.city || 'To confirm',
      country: s.country,
      bedrooms: s.bedrooms,
      bathrooms: s.bathrooms,
      area_sqft: isPlot ? null : toSqft(s.size_value, s.size_unit),
      plot_size: isPlot ? s.size_value : null,
      plot_size_unit: isPlot ? s.size_unit : null,
      furnishing: s.furnishing,
      available_from: s.available_from,
      description: s.message,
      status: 'pending',
      featured: false,
      verified: false,
    }

    // Copy photos to the public listing bucket.
    const images: string[] = []
    for (const [i, path] of (s.images || []).entries()) {
      const { data: file, error: dlError } = await auth.supabase.storage.from('platform-files').download(path)
      if (dlError || !file) {
        logError('api.admin.submissions', dlError, { step: 'download', path })
        continue
      }
      const ext = path.split('.').pop() || 'jpg'
      const dest = `submissions/${s.reference}/${i + 1}.${ext}`
      const { error: upError } = await auth.supabase.storage.from('property-images').upload(dest, file, { contentType: file.type || 'image/jpeg', upsert: true })
      if (upError) logError('api.admin.submissions', upError, { step: 'upload', dest })
      else images.push(dest)
    }
    listing.images = images

    const { data: created, error: insertError } = await auth.supabase.from('property_listings').insert(listing).select('id').single()
    if (insertError || !created) {
      return NextResponse.json({ error: insertError?.message || 'Could not create the listing.' }, { status: 400 })
    }

    await auth.supabase
      .from('property_submissions')
      .update({ status: 'converted', listing_id: created.id, reviewed_by: auth.userId, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    await logActivity({ actorId: auth.userId, action: 'submission.converted', targetId: id, metadata: { listing_id: created.id, reference: s.reference } })

    return NextResponse.json({ success: true, listing_id: created.id, images: images.length })
  } catch (err) {
    logError('api.admin.submissions', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
