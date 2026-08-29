import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const adminClient = createAdminClient()

    // Fetch the service by slug
    const { data: service, error: serviceError } = await adminClient
      .from('services')
      .select('id, name, slug, description, icon_url, image_url')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Fetch active products for this service
    const { data: products, error: productsError } = await adminClient
      .from('products')
      .select('id, name, slug, description, image_url, is_enquiry_enabled')
      .eq('service_id', service.id)
      .eq('is_active', true)
      .order('display_order')

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    return NextResponse.json({ ...service, products: products || [] })
  } catch (err) {
    console.error('GET /api/public/services/[slug] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
