import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'


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

export async function GET(request: NextRequest) {
  try {
    const userClient = createAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'real_estate_partner' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('partner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: properties })
  } catch (err) {
    console.error('GET /api/partner/properties error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userClient = createAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success: rateLimitOk } = rateLimit(`property-create:${user.id}`, 10, 3600000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'real_estate_partner' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      areaSqft,
      bedrooms,
      bathrooms,
      description,
      features,
      images,
    } = body

    if (!title || !propertyType || !listingType || !location || !city) {
      return NextResponse.json(
        { error: 'Missing required fields: title, propertyType, listingType, location, city' },
        { status: 400 }
      )
    }

    // Parse features from comma-separated string
    const featuresArray = features
      ? (typeof features === 'string' ? features.split(',').map((f: string) => f.trim()).filter(Boolean) : features)
      : []

    // Upload images from base64
    const imageUrls: string[] = []
    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length && i < 10; i++) {
        const img = images[i]
        if (!img) continue

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

        const buffer = Buffer.from(base64Data, 'base64')
        const ext = contentType.split('/')[1] || 'jpg'
        const filePath = `properties/${user.id}/${Date.now()}_${i}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('platform-files')
          .upload(filePath, buffer, { contentType, upsert: false })

        if (!uploadError) {
          imageUrls.push(filePath)
        } else {
          console.error(`Failed to upload image ${i}:`, uploadError.message)
        }
      }
    }

    const { data: property, error: insertError } = await supabase
      .from('property_listings')
      .insert({
        partner_id: user.id,
        title,
        property_type: propertyType,
        listing_type: listingType,
        price: price || null,
        currency: currency || 'PKR',
        location,
        city,
        area_sqft: areaSqft || null,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        description: description || null,
        features: featuresArray,
        images: imageUrls,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError || !property) {
      return NextResponse.json({ error: insertError?.message || 'Failed to create property' }, { status: 500 })
    }

    // Notify super admins
    const { data: superAdmins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin')

    if (superAdmins && superAdmins.length > 0) {
      const notifications = superAdmins.map((admin) => ({
        user_id: admin.id,
        type: 'property_submitted' as const,
        title: 'New Property Listing',
        body: `New property "${title}" submitted for approval.`,
        link: `/admin/properties`,
        is_read: false,
      }))
      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json({ data: property }, { status: 201 })
  } catch (err) {
    console.error('POST /api/partner/properties error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
