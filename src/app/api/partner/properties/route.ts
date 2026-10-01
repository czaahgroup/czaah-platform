import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'
import {
  LISTING_IMAGE_TYPES,
  LISTING_IMAGE_MAX_BYTES,
  PARTNER_MAX_PHOTOS,
  PARTNER_UPLOAD_PREFIX,
  base64Bytes,
  sniffImageType,
} from '@/lib/uploadSafety'
import { rentalTermsForInsert } from '@/lib/rentalTerms'
import { plotColumnsFromBody } from '@/lib/developments'
import { assetClassFor, isPlotListing, validatePlotListing } from '@/lib/plots'
import { CURRENCIES } from '@/lib/currencies'
import { requireLister, notifyAdmins } from '@/lib/partnerListingAuth'


export async function GET(request: NextRequest) {
  try {
    const auth = await requireLister(request)
    if (auth.error) return auth.error
    const { supabase, userId } = auth

    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('partner_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Whether each listing has an edit waiting for approval, or one that was turned down.
    const ids = (properties || []).map((p) => p.id)
    const { data: changes } = ids.length
      ? await supabase.from('property_listing_changes').select('listing_id, status, note').in('listing_id', ids)
      : { data: [] }
    const byListing = new Map((changes || []).map((c) => [c.listing_id, c]))

    return NextResponse.json({
      data: (properties || []).map((p) => ({
        ...p,
        change_status: byListing.get(p.id)?.status || null,
        change_note: byListing.get(p.id)?.note || null,
      })),
    })
  } catch (err) {
    logError("api.partner.properties", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireLister(request)
    if (auth.error) return auth.error
    const { supabase } = auth
    const user = { id: auth.userId }

    const { success: rateLimitOk } = rateLimit(`property-create:${user.id}`, 10, 3600000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const {
      title,
      propertyType,
      listingType,
      price,
      currency,
      location,
      city,
      country,
      areaSqft,
      bedrooms,
      bathrooms,
      description,
      features,
      images,
      videoUrl,
      videoPosterUrl,
    } = body

    // The upload form sends one "Property type" value; when it is a subtype
    // (house, plot, …) the asset class is derived from it.
    const subtype = body.propertySubtype as string | undefined
    const resolvedType = propertyType || assetClassFor(subtype)

    if (!title || !resolvedType || !listingType || !location || !city || !country) {
      return NextResponse.json(
        { error: 'Missing required fields: title, propertyType (or propertySubtype), listingType, location, city, country' },
        { status: 400 }
      )
    }

    // Plots are checked against plot rules — a plot has no bedrooms, and
    // demanding them is exactly what stopped land being listed before.
    if (isPlotListing({ property_subtype: subtype, property_type: resolvedType })) {
      const problems = validatePlotListing({
        title, country, city,
        plotSize: body.plotSize,
        plotSizeUnit: body.plotSizeUnit,
        plotCategory: body.plotCategory,
        price,
        currency: currency || 'PKR',
        // Images are uploaded further down; check the incoming payload.
        images,
        supportedCurrencies: CURRENCIES,
      })
      if (problems.length) {
        return NextResponse.json({ error: problems.join(' ') }, { status: 400 })
      }
    }

    // Parse features from comma-separated string
    const featuresArray = features
      ? (typeof features === 'string' ? features.split(',').map((f: string) => f.trim()).filter(Boolean) : features)
      : []

    // Images arrive either as storage paths the browser already uploaded to
    // (the photo uploader) or as base64 data URLs (older clients).
    const imageUrls: string[] = []
    if (images && Array.isArray(images)) {
      const ownPrefix = PARTNER_UPLOAD_PREFIX(user.id)
      for (let i = 0; i < images.length && i < PARTNER_MAX_PHOTOS; i++) {
        const img = images[i]
        if (!img || typeof img !== 'string') continue

        if (!img.startsWith('data:')) {
          // Only the caller's own staging folder, and no traversal out of it.
          if (!img.startsWith(ownPrefix) || img.includes('..') || img.slice(ownPrefix.length).includes('/')) {
            logError('api.partner.properties', new Error('image rejected: foreign path'), { index: i })
            continue
          }
          // The bucket is public, so re-check what actually landed there.
          const { data: blob, error: dlError } = await supabase.storage.from('property-images').download(img)
          const head = blob ? new Uint8Array(await blob.slice(0, 16).arrayBuffer()) : null
          const sniffedPath = head ? sniffImageType(head) : null
          if (dlError || !blob || blob.size > LISTING_IMAGE_MAX_BYTES || !sniffedPath || !LISTING_IMAGE_TYPES[sniffedPath]) {
            logError('api.partner.properties', new Error('image rejected: uploaded file failed checks'), { index: i })
            if (blob) await supabase.storage.from('property-images').remove([img])
            continue
          }
          imageUrls.push(img)
          continue
        }

        // Support both raw base64 and data URL format
        let base64Data = img
        let contentType = 'image/jpeg'
        if (img.startsWith('data:')) {
          const match = img.match(/^data:([^;]+);base64,(.+)$/)
          if (match) {
            contentType = match[1]
            base64Data = match[2]
          }
        }

        // The declared type is the caller's choice and this bucket is public,
        // so check the size before decoding and the real bytes after.
        if (typeof base64Data !== 'string' || base64Bytes(base64Data) > LISTING_IMAGE_MAX_BYTES) {
          logError('api.partner.properties', new Error('image rejected: too large'), { index: i })
          continue
        }
        const buffer = Buffer.from(base64Data, 'base64')
        const sniffed = sniffImageType(buffer)
        if (!sniffed || !LISTING_IMAGE_TYPES[sniffed]) {
          logError('api.partner.properties', new Error('image rejected: not a JPEG/PNG/WebP/AVIF'), { index: i, declared: contentType })
          continue
        }
        contentType = sniffed
        const ext = LISTING_IMAGE_TYPES[sniffed]
        const filePath = `properties/${user.id}/${Date.now()}_${i}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, buffer, { contentType, upsert: false })

        if (!uploadError) {
          imageUrls.push(filePath)
        } else {
          logError('api.partner.properties', uploadError, { step: 'image-upload', index: i })
        }
      }
    }

    const { data: property, error: insertError } = await supabase
      .from('property_listings')
      .insert({
        partner_id: user.id,
        title,
        property_type: resolvedType,
        listing_type: listingType,
        price: price || null,
        currency: currency || 'PKR',
        location,
        city,
        country,
        area_sqft: areaSqft || null,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        description: description || null,
        features: featuresArray,
        images: imageUrls,
        video_url: videoUrl || null,
        video_poster_url: videoPosterUrl || null,
        ...plotColumnsFromBody(body),
        ...rentalTermsForInsert(listingType, body),
        // A partner cannot self-verify or self-feature; admin approval sets these.
        approved: false,
        featured: false,
        verified: false,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError || !property) {
      return NextResponse.json({ error: insertError?.message || 'Failed to create property' }, { status: 500 })
    }

    await notifyAdmins(supabase, 'New Property Listing', `New property "${title}" submitted for approval.`)

    return NextResponse.json({ data: property }, { status: 201 })
  } catch (err) {
    logError("api.partner.properties", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
